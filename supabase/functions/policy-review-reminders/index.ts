// supabase/functions/policy-review-reminders/index.ts
// CRON job: Sends notifications for policies needing review
// Requires X-Job-Token header for authentication (verify_jwt=false)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { getPracticeManagersForPractice } from '../_shared/capabilities.ts';

interface PolicyReviewAlert {
  practice_id: string;
  practice_name: string;
  overdue_count: number;
  due_soon_count: number;
  due_month_count: number;
  policies: {
    id: string;
    title: string;
    review_due: string;
    days_until_due: number;
  }[];
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    requireCronSecret(req);

    console.log('🔔 Starting policy review reminders check...');

    const supabaseAdmin = createServiceClient();

    // Get all active policies that need review attention (30 days or less)
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('policy_documents')
      .select(`
        id,
        title,
        review_due,
        practice_id,
        practices (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .lte('review_due', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('review_due', { ascending: true });

    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
      throw policiesError;
    }

    console.log(`Found ${policies?.length || 0} policies needing review attention`);

    if (!policies || policies.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true,
          message: 'No policies requiring review attention',
          policies_checked: 0
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Group by practice
    const practiceAlerts = new Map<string, PolicyReviewAlert>();
    
    for (const policy of policies) {
      const practiceId = policy.practice_id;
      const practiceName = (policy.practices as any)?.name || 'Unknown Practice';
      const reviewDue = new Date(policy.review_due);
      const today = new Date();
      const daysUntilDue = Math.floor((reviewDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (!practiceAlerts.has(practiceId)) {
        practiceAlerts.set(practiceId, {
          practice_id: practiceId,
          practice_name: practiceName,
          overdue_count: 0,
          due_soon_count: 0,
          due_month_count: 0,
          policies: []
        });
      }

      const alert = practiceAlerts.get(practiceId)!;
      alert.policies.push({
        id: policy.id,
        title: policy.title,
        review_due: policy.review_due,
        days_until_due: daysUntilDue
      });

      if (daysUntilDue < 0) {
        alert.overdue_count++;
      } else if (daysUntilDue <= 7) {
        alert.due_soon_count++;
      } else {
        alert.due_month_count++;
      }
    }

    console.log(`Grouped into ${practiceAlerts.size} practices`);

    let notificationsCreated = 0;
    
    for (const [practiceId, alert] of practiceAlerts) {
      // Get practice managers using role system with fallback
      const practiceManagers = await getPracticeManagersForPractice(supabaseAdmin, practiceId);

      if (practiceManagers.length === 0) {
        console.warn(`No active practice managers found for practice ${practiceId}`);
        continue;
      }

      for (const pm of practiceManagers) {
        let priority = 'normal';
        let title = 'Policy Reviews Due';
        let message = '';

        if (alert.overdue_count > 0) {
          priority = 'urgent';
          title = '⚠️ Overdue Policy Reviews';
          message = `${alert.overdue_count} ${alert.overdue_count === 1 ? 'policy is' : 'policies are'} overdue for review. `;
        } else if (alert.due_soon_count > 0) {
          priority = 'high';
          title = '⏰ Policy Reviews Due Soon';
          message = `${alert.due_soon_count} ${alert.due_soon_count === 1 ? 'policy' : 'policies'} due within 7 days. `;
        }

        if (alert.due_month_count > 0) {
          message += `${alert.due_month_count} additional ${alert.due_month_count === 1 ? 'policy' : 'policies'} due within 30 days.`;
        }

        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            practice_id: practiceId,
            user_id: pm.id,
            title,
            message,
            notification_type: 'policy_review',
            priority,
            action_url: '/policies',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              overdue_count: alert.overdue_count,
              due_soon_count: alert.due_soon_count,
              due_month_count: alert.due_month_count,
              policies: alert.policies
            }
          });

        if (notificationError) {
          console.error(`Error creating notification for PM ${pm.id}:`, notificationError);
        } else {
          notificationsCreated++;
          console.log(`✅ Notification created for ${pm.name}`);
        }
      }
    }

    const summary = {
      ok: true,
      timestamp: new Date().toISOString(),
      policies_checked: policies.length,
      practices_affected: practiceAlerts.size,
      notifications_created: notificationsCreated,
      breakdown: Array.from(practiceAlerts.values()).map(alert => ({
        practice: alert.practice_name,
        overdue: alert.overdue_count,
        due_soon: alert.due_soon_count,
        due_month: alert.due_month_count
      }))
    };

    console.log('✅ Policy review reminders completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in policy-review-reminders:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
