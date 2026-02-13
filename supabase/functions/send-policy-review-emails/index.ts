import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PolicyReviewEmail } from './_templates/policy-review-email.tsx';
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { getUsersWithCapability } from '../_shared/capabilities.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface OverduePolicy {
  id: string;
  title: string;
  version: string;
  review_due: string;
  owner_role: string;
}

interface PracticeData {
  practice_id: string;
  practice_name: string;
  overdue_policies: OverduePolicy[];
  practice_managers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Only accept POST requests from CRON jobs
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify CRON secret
  const authError = requireCronSecret(req);
  if (authError) return authError;

  const supabase = createServiceClient();

  console.log('📧 Starting weekly policy review email notifications...');

  try {
    // Fetch all overdue policies
    const { data: overdueData, error: policiesError } = await supabase
      .from('policy_documents')
      .select(`
        id,
        title,
        version,
        review_due,
        owner_role,
        practice_id,
        practices!inner(name)
      `)
      .eq('status', 'active')
      .lt('review_due', new Date().toISOString())
      .order('review_due', { ascending: true });

    if (policiesError) {
      console.error('Error fetching overdue policies:', policiesError);
      throw policiesError;
    }

    if (!overdueData || overdueData.length === 0) {
      console.log('✅ No overdue policies found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No overdue policies found',
          emails_sent: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${overdueData.length} overdue policies`);

    // Group policies by practice
    const practiceMap = new Map<string, PracticeData>();

    for (const policy of overdueData) {
      const practiceId = policy.practice_id;
      if (!practiceMap.has(practiceId)) {
        practiceMap.set(practiceId, {
          practice_id: practiceId,
          practice_name: (policy.practices as any).name,
          overdue_policies: [],
          practice_managers: [],
        });
      }

      const practiceData = practiceMap.get(practiceId)!;
      practiceData.overdue_policies.push({
        id: policy.id,
        title: policy.title,
        version: policy.version || 'unversioned',
        review_due: policy.review_due!,
        owner_role: policy.owner_role || 'Not assigned',
      });
    }

    console.log(`Grouped into ${practiceMap.size} practice(s)`);

    // Fetch practice managers for each practice
    for (const [practiceId, practiceData] of practiceMap.entries()) {
      // Get users with review_policies capability (includes managers, IG leads, etc.)
      const usersWithCapability = await getUsersWithCapability(
        supabase,
        practiceId,
        'review_policies'
      );

      practiceData.practice_managers = usersWithCapability;

      console.log(`Found ${practiceData.practice_managers.length} user(s) with review_policies capability for ${practiceData.practice_name}`);
    }

    // Send emails
    let emailsSent = 0;
    const emailResults = [];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    for (const practiceData of practiceMap.values()) {
      if (practiceData.practice_managers.length === 0) {
        console.log(`⚠️ No managers found for ${practiceData.practice_name}, skipping email`);
        continue;
      }

      for (const manager of practiceData.practice_managers) {
        try {
          // Render the React Email template
          const html = await renderAsync(
            React.createElement(PolicyReviewEmail, {
              managerName: manager.name,
              practiceName: practiceData.practice_name,
              overdueCount: practiceData.overdue_policies.length,
              policies: practiceData.overdue_policies,
              dashboardUrl: `${supabaseUrl.replace('.supabase.co', '')}/policies`,
            })
          );

          const { data, error } = await resend.emails.send({
            from: 'Policy Manager <onboarding@resend.dev>',
            to: [manager.email],
            subject: `⚠️ ${practiceData.overdue_policies.length} Policy Review${practiceData.overdue_policies.length > 1 ? 's' : ''} Overdue - ${practiceData.practice_name}`,
            html,
          });

          if (error) {
            console.error(`❌ Failed to send email to ${manager.email}:`, error);
            
            // Log failed email
            await supabase.from('email_logs').insert({
              practice_id: practiceData.practice_id,
              recipient_email: manager.email,
              recipient_name: manager.name,
              email_type: 'policy_review',
              subject: `⚠️ ${practiceData.overdue_policies.length} Policy Review${practiceData.overdue_policies.length > 1 ? 's' : ''} Overdue - ${practiceData.practice_name}`,
              status: 'failed',
              error_message: error.message,
              metadata: { overdue_count: practiceData.overdue_policies.length },
            });
            
            emailResults.push({
              recipient: manager.email,
              success: false,
              error: error.message,
            });
          } else {
            console.log(`✅ Email sent to ${manager.name} (${manager.email})`);
            emailsSent++;
            
            // Log successful email
            await supabase.from('email_logs').insert({
              practice_id: practiceData.practice_id,
              resend_email_id: data?.id,
              recipient_email: manager.email,
              recipient_name: manager.name,
              email_type: 'policy_review',
              subject: `⚠️ ${practiceData.overdue_policies.length} Policy Review${practiceData.overdue_policies.length > 1 ? 's' : ''} Overdue - ${practiceData.practice_name}`,
              status: 'sent',
              metadata: { overdue_count: practiceData.overdue_policies.length },
            });
            
            emailResults.push({
              recipient: manager.email,
              success: true,
              emailId: data?.id,
            });
          }
        } catch (emailError) {
          console.error(`❌ Error sending email to ${manager.email}:`, emailError);
          emailResults.push({
            recipient: manager.email,
            success: false,
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
          });
        }
      }
    }

    console.log(`📧 Weekly email notifications completed: ${emailsSent} email(s) sent`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        overdue_policies: overdueData.length,
        practices_affected: practiceMap.size,
        emails_sent: emailsSent,
        email_results: emailResults,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in send-policy-review-emails:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
