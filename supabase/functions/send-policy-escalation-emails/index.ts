import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { PolicyEscalationEmail } from './_templates/policy-escalation-email.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Total days after effective_from to escalate (7 days initial + 14 days grace = 21 days)
const ESCALATION_DAYS_THRESHOLD = 21;

interface UnacknowledgedStaff {
  staff_id: string;
  staff_name: string;
  staff_email: string;
  unacknowledged_policies: Array<{
    policy_title: string;
    policy_version: string;
    effective_from: string;
    days_overdue: number;
  }>;
}

interface ManagerData {
  manager_id: string;
  manager_name: string;
  manager_email: string;
  practice_id: string;
  practice_name: string;
  unacknowledged_staff: UnacknowledgedStaff[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🚨 Starting policy acknowledgment escalation notifications...');

  try {
    // Calculate the escalation cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ESCALATION_DAYS_THRESHOLD);

    // Fetch all active policies that have been effective for at least ESCALATION_DAYS_THRESHOLD days
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
      console.log('✅ No policies requiring escalation found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No policies requiring escalation',
          emails_sent: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${activePolicies.length} policies requiring escalation checks`);

    // Map to store manager data
    const managersMap = new Map<string, ManagerData>();
    const practiceManagersMap = new Map<string, ManagerData>();

    for (const policy of activePolicies) {
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

      if (unacknowledgedUsers.length === 0) continue;

      // Calculate days overdue
      const effectiveDate = new Date(policy.effective_from);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get employees with their managers
      const { data: employees } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          manager_id,
          name,
          manager:employees!employees_manager_id_fkey(
            id,
            user_id,
            name
          )
        `)
        .eq('practice_id', policy.practice_id)
        .in('user_id', unacknowledgedUsers.map(u => u.id));

      // Get practice managers for this practice
      const { data: practiceManagerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('practice_id', policy.practice_id)
        .eq('role', 'practice_manager');

      const practiceManagerIds = practiceManagerRoles?.map(r => r.user_id) || [];

      // Process each unacknowledged user
      for (const user of unacknowledgedUsers) {
        const employee = employees?.find(e => e.user_id === user.id);
        
        const policyInfo = {
          policy_title: policy.title,
          policy_version: policy.version || 'unversioned',
          effective_from: policy.effective_from,
          days_overdue: daysOverdue,
        };

        const staffInfo: UnacknowledgedStaff = {
          staff_id: user.id,
          staff_name: user.name,
          staff_email: user.email,
          unacknowledged_policies: [policyInfo],
        };

        // Add to direct manager if they have one
        if (employee?.manager_id && (employee.manager as any)?.user_id) {
          const managerUserId = (employee.manager as any).user_id;
          const managerName = (employee.manager as any).name;
          
          // Get manager's email
          const managerUser = practiceUsers.find(u => u.id === managerUserId);
          if (managerUser) {
            if (!managersMap.has(managerUserId)) {
              managersMap.set(managerUserId, {
                manager_id: managerUserId,
                manager_name: managerName,
                manager_email: managerUser.email,
                practice_id: policy.practice_id,
                practice_name: (policy.practices as any).name,
                unacknowledged_staff: [],
              });
            }

            const managerData = managersMap.get(managerUserId)!;
            const existingStaff = managerData.unacknowledged_staff.find(s => s.staff_id === user.id);
            if (existingStaff) {
              existingStaff.unacknowledged_policies.push(policyInfo);
            } else {
              managerData.unacknowledged_staff.push(staffInfo);
            }
          }
        }

        // Also add to practice managers
        for (const pmId of practiceManagerIds) {
          const pmUser = practiceUsers.find(u => u.id === pmId);
          if (pmUser) {
            if (!practiceManagersMap.has(pmId)) {
              practiceManagersMap.set(pmId, {
                manager_id: pmId,
                manager_name: pmUser.name,
                manager_email: pmUser.email,
                practice_id: policy.practice_id,
                practice_name: (policy.practices as any).name,
                unacknowledged_staff: [],
              });
            }

            const pmData = practiceManagersMap.get(pmId)!;
            const existingStaff = pmData.unacknowledged_staff.find(s => s.staff_id === user.id);
            if (existingStaff) {
              const existingPolicy = existingStaff.unacknowledged_policies.find(
                p => p.policy_title === policyInfo.policy_title
              );
              if (!existingPolicy) {
                existingStaff.unacknowledged_policies.push(policyInfo);
              }
            } else {
              pmData.unacknowledged_staff.push({ ...staffInfo });
            }
          }
        }
      }
    }

    // Combine both maps (practice managers get priority)
    const allManagers = new Map([...managersMap, ...practiceManagersMap]);

    console.log(`Found ${allManagers.size} manager(s) to notify about unacknowledged policies`);

    if (allManagers.size === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No escalations needed - all policies acknowledged',
          emails_sent: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send escalation emails to managers
    let emailsSent = 0;
    const emailResults = [];

    for (const managerData of allManagers.values()) {
      try {
        const totalUnacknowledged = managerData.unacknowledged_staff.reduce(
          (sum, staff) => sum + staff.unacknowledged_policies.length,
          0
        );

        // Render the React Email template
        const html = await renderAsync(
          React.createElement(PolicyEscalationEmail, {
            managerName: managerData.manager_name,
            practiceName: managerData.practice_name,
            staffCount: managerData.unacknowledged_staff.length,
            policyCount: totalUnacknowledged,
            staffMembers: managerData.unacknowledged_staff,
            dashboardUrl: `${supabaseUrl.replace('.supabase.co', '')}/policies`,
          })
        );

        const { data, error } = await resend.emails.send({
          from: 'Policy Manager <onboarding@resend.dev>',
          to: [managerData.manager_email],
          subject: `🚨 ESCALATION: ${managerData.unacknowledged_staff.length} Staff Member${managerData.unacknowledged_staff.length > 1 ? 's' : ''} Need Policy Acknowledgment`,
          html,
        });

        if (error) {
          console.error(`❌ Failed to send escalation email to ${managerData.manager_email}:`, error);
          emailResults.push({
            recipient: managerData.manager_email,
            success: false,
            error: error.message,
          });
        } else {
          console.log(`✅ Escalation email sent to ${managerData.manager_name} (${managerData.manager_email})`);
          emailsSent++;
          emailResults.push({
            recipient: managerData.manager_email,
            success: true,
            emailId: data?.id,
          });
        }
      } catch (emailError) {
        console.error(`❌ Error sending escalation email to ${managerData.manager_email}:`, emailError);
        emailResults.push({
          recipient: managerData.manager_email,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });
      }
    }

    console.log(`🚨 Escalation notifications completed: ${emailsSent} email(s) sent to managers`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        policies_checked: activePolicies.length,
        managers_notified: allManagers.size,
        emails_sent: emailsSent,
        escalation_threshold_days: ESCALATION_DAYS_THRESHOLD,
        email_results: emailResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in send-policy-escalation-emails:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
