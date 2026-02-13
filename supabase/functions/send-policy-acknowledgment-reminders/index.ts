import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { AcknowledgmentReminderEmail } from './_templates/acknowledgment-reminder-email.tsx';
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Number of days after effective_from to send first reminder
const REMINDER_DAYS_THRESHOLD = 7;

interface UnacknowledgedPolicy {
  policy_id: string;
  policy_title: string;
  policy_version: string;
  effective_from: string;
  days_overdue: number;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  practice_id: string;
  practice_name: string;
  unacknowledged_policies: UnacknowledgedPolicy[];
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

  console.log('📧 Starting policy acknowledgment reminder notifications...');

  try {
    // Calculate the cutoff date (policies effective before this need acknowledgment)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - REMINDER_DAYS_THRESHOLD);

    // Fetch all active policies that have been effective for at least REMINDER_DAYS_THRESHOLD days
    const { data: activePolicies, error: policiesError } = await supabase
      .from('policy_documents')
      .select(`
        id,
        title,
        version,
        effective_from,
        practice_id,
        practices!inner(name)
      `)
      .eq('status', 'active')
      .not('effective_from', 'is', null)
      .lte('effective_from', cutoffDate.toISOString())
      .order('effective_from', { ascending: false });

    if (policiesError) {
      console.error('Error fetching active policies:', policiesError);
      throw policiesError;
    }

    if (!activePolicies || activePolicies.length === 0) {
      console.log('✅ No policies requiring acknowledgment reminders found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No policies requiring acknowledgment reminders',
          emails_sent: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${activePolicies.length} policies requiring acknowledgment checks`);

    // For each policy, find users who haven't acknowledged it
    const staffMembersMap = new Map<string, StaffMember>();

    for (const policy of activePolicies) {
      const policyKey = `${policy.id}_${policy.version || 'unversioned'}`;
      
      // Get all acknowledgments for this policy
      const { data: acknowledgments } = await supabase
        .from('policy_acknowledgments')
        .select('user_id')
        .eq('policy_id', policy.id)
        .eq('version_acknowledged', policy.version || 'unversioned');

      const acknowledgedUserIds = new Set(acknowledgments?.map(a => a.user_id) || []);

      // Get all active users in this practice
      const { data: practiceUsers } = await supabase
        .from('users')
        .select('id, name, email, practice_id')
        .eq('practice_id', policy.practice_id)
        .eq('is_active', true);

      if (!practiceUsers) continue;

      // Find users who haven't acknowledged
      const unacknowledgedUsers = practiceUsers.filter(u => !acknowledgedUserIds.has(u.id));

      // Calculate days overdue
      const effectiveDate = new Date(policy.effective_from);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24)) - REMINDER_DAYS_THRESHOLD;

      // Add to each user's list of unacknowledged policies
      for (const user of unacknowledgedUsers) {
        if (!staffMembersMap.has(user.id)) {
          staffMembersMap.set(user.id, {
            id: user.id,
            name: user.name,
            email: user.email,
            practice_id: policy.practice_id,
            practice_name: (policy.practices as any).name,
            unacknowledged_policies: [],
          });
        }

        const staffMember = staffMembersMap.get(user.id)!;
        staffMember.unacknowledged_policies.push({
          policy_id: policy.id,
          policy_title: policy.title,
          policy_version: policy.version || 'unversioned',
          effective_from: policy.effective_from,
          days_overdue: daysOverdue,
        });
      }
    }

    console.log(`Found ${staffMembersMap.size} staff member(s) with unacknowledged policies`);

    if (staffMembersMap.size === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'All policies have been acknowledged',
          emails_sent: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send reminder emails
    let emailsSent = 0;
    const emailResults = [];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    for (const staffMember of staffMembersMap.values()) {
      try {
        // Render the React Email template
        const html = await renderAsync(
          React.createElement(AcknowledgmentReminderEmail, {
            staffName: staffMember.name,
            practiceName: staffMember.practice_name,
            unacknowledgedCount: staffMember.unacknowledged_policies.length,
            policies: staffMember.unacknowledged_policies,
            dashboardUrl: `${supabaseUrl.replace('.supabase.co', '')}/policies`,
          })
        );

        const { data, error } = await resend.emails.send({
          from: 'Policy Manager <onboarding@resend.dev>',
          to: [staffMember.email],
          subject: `⏰ Reminder: ${staffMember.unacknowledged_policies.length} Policy Acknowledgment${staffMember.unacknowledged_policies.length > 1 ? 's' : ''} Pending`,
          html,
        });

        if (error) {
          console.error(`❌ Failed to send email to ${staffMember.email}:`, error);
          
          // Log failed email
          await supabase.from('email_logs').insert({
            practice_id: staffMember.practice_id,
            recipient_email: staffMember.email,
            recipient_name: staffMember.name,
            email_type: 'policy_acknowledgment_reminder',
            subject: `⏰ Reminder: ${staffMember.unacknowledged_policies.length} Policy Acknowledgment${staffMember.unacknowledged_policies.length > 1 ? 's' : ''} Pending`,
            status: 'failed',
            error_message: error.message,
            metadata: { unacknowledged_count: staffMember.unacknowledged_policies.length },
          });
          
          emailResults.push({
            recipient: staffMember.email,
            success: false,
            error: error.message,
          });
        } else {
          console.log(`✅ Reminder email sent to ${staffMember.name} (${staffMember.email})`);
          emailsSent++;
          
          // Log successful email
          await supabase.from('email_logs').insert({
            practice_id: staffMember.practice_id,
            resend_email_id: data?.id,
            recipient_email: staffMember.email,
            recipient_name: staffMember.name,
            email_type: 'policy_acknowledgment_reminder',
            subject: `⏰ Reminder: ${staffMember.unacknowledged_policies.length} Policy Acknowledgment${staffMember.unacknowledged_policies.length > 1 ? 's' : ''} Pending`,
            status: 'sent',
            metadata: { unacknowledged_count: staffMember.unacknowledged_policies.length },
          });
          
          emailResults.push({
            recipient: staffMember.email,
            success: true,
            emailId: data?.id,
          });
        }
      } catch (emailError) {
        console.error(`❌ Error sending email to ${staffMember.email}:`, emailError);
        emailResults.push({
          recipient: staffMember.email,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
      }
    }

    console.log(`📧 Acknowledgment reminder notifications completed: ${emailsSent} email(s) sent`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        policies_checked: activePolicies.length,
        staff_notified: staffMembersMap.size,
        emails_sent: emailsSent,
        reminder_threshold_days: REMINDER_DAYS_THRESHOLD,
        email_results: emailResults,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error in send-policy-acknowledgment-reminders:', error);
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
