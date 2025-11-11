import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Processing scheduled reminders...');
    const now = new Date();

    // Fetch reminders that are due
    const { data: dueReminders, error: fetchError } = await supabaseAdmin
      .from('scheduled_reminders')
      .select('*')
      .lte('next_run_at', now.toISOString())
      .eq('is_active', true);

    if (fetchError) throw fetchError;

    if (!dueReminders || dueReminders.length === 0) {
      console.log('No reminders due');
      return new Response(
        JSON.stringify({ success: true, message: 'No reminders due', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueReminders.length} due reminders`);

    let processedCount = 0;
    let notificationsCreated = 0;

    for (const reminder of dueReminders) {
      try {
        // Get practice managers for this practice
        const { data: practiceManagers } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .eq('practice_id', reminder.practice_id)
          .eq('is_active', true)
          .eq('is_practice_manager', true);

        if (!practiceManagers || practiceManagers.length === 0) {
          console.log(`No practice managers found for practice ${reminder.practice_id}`);
          continue;
        }

        // Create notification based on reminder type
        let notificationMessage = '';
        let notificationPriority = 'medium';
        let notificationLink = '/';

        switch (reminder.reminder_type) {
          case 'claim_reminder':
            notificationMessage = `Enhanced Services Claims Review - ${reminder.metadata?.description || 'Due today'}`;
            notificationPriority = 'high';
            notificationLink = '/claims';
            break;
          
          case 'ipc_audit_due':
            notificationMessage = `Infection Control Audit Due - ${reminder.metadata?.description || 'Six-monthly audit'}`;
            notificationPriority = 'high';
            notificationLink = '/infection-control';
            break;
          
          case 'fire_assessment_due':
            notificationMessage = 'Annual Fire Risk Assessment Due - Please complete assessment';
            notificationPriority = 'high';
            notificationLink = '/fire-safety';
            break;
          
          case 'coshh_due':
            notificationMessage = 'COSHH Assessment Due - Annual review required';
            notificationPriority = 'medium';
            notificationLink = '/fire-safety';
            break;
          
          case 'legionella_due':
            notificationMessage = 'Legionella Testing Due - Annual assessment required';
            notificationPriority = 'high';
            notificationLink = '/fire-safety';
            break;
          
          case 'room_assessment_due':
            notificationMessage = 'Room Assessment Due - Annual inspection required';
            notificationPriority = 'medium';
            notificationLink = '/fire-safety';
            break;
          
          case 'dbs_review_due':
            notificationMessage = `DBS Review Due - ${reminder.metadata?.employee_name || 'Staff member'} requires review`;
            notificationPriority = 'high';
            notificationLink = '/hr';
            break;
          
          case 'training_expiry':
            notificationMessage = `Training Expiring Soon - ${reminder.metadata?.course_name || 'Certificate'} for ${reminder.metadata?.employee_name || 'staff member'}`;
            notificationPriority = 'medium';
            notificationLink = '/hr';
            break;
          
          case 'appraisal_due':
            notificationMessage = `Annual Appraisal Due - ${reminder.metadata?.employee_name || 'Staff member'}`;
            notificationPriority = 'medium';
            notificationLink = '/hr';
            break;
          
          case 'complaint_holding_letter':
            notificationMessage = `Complaint Holding Letter Due - 48-hour deadline for complaint #${reminder.metadata?.complaint_id || 'N/A'}`;
            notificationPriority = 'urgent';
            notificationLink = '/complaints';
            break;
          
          case 'complaint_final_response':
            notificationMessage = `Complaint Final Response Due - 30-day deadline for complaint #${reminder.metadata?.complaint_id || 'N/A'}`;
            notificationPriority = 'urgent';
            notificationLink = '/complaints';
            break;
          
          case 'medical_request_reminder':
            notificationMessage = `Medical Request Reminder - 20 days since receipt for request #${reminder.metadata?.request_id || 'N/A'}`;
            notificationPriority = 'high';
            notificationLink = '/medical-requests';
            break;
          
          case 'medical_request_escalation':
            notificationMessage = `Medical Request ESCALATION - 30 days since receipt for request #${reminder.metadata?.request_id || 'N/A'}`;
            notificationPriority = 'urgent';
            notificationLink = '/medical-requests';
            break;
          
          case 'fridge_temp_alert':
            notificationMessage = `Fridge Temperature Out of Range - ${reminder.metadata?.fridge_name || 'Fridge'} at ${reminder.metadata?.temperature || 'N/A'}°C`;
            notificationPriority = 'urgent';
            notificationLink = '/fridge-temps';
            break;
          
          case 'policy_review_due':
            notificationMessage = `Policy Review Due - ${reminder.metadata?.policy_title || 'Policy'} requires annual review`;
            notificationPriority = 'medium';
            notificationLink = '/policies';
            break;
          
          case 'task_overdue':
            notificationMessage = `Task Overdue - ${reminder.metadata?.task_title || 'Task'} is past SLA`;
            notificationPriority = 'high';
            notificationLink = '/tasks';
            break;
          
          default:
            notificationMessage = reminder.metadata?.description || 'Reminder notification';
            notificationPriority = 'medium';
        }

        // Create notifications for all practice managers
        for (const manager of practiceManagers) {
          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: manager.id,
              practice_id: reminder.practice_id,
              notification_type: reminder.reminder_type,
              priority: notificationPriority,
              title: 'Scheduled Reminder',
              message: notificationMessage,
              action_url: notificationLink,
              is_read: false,
            });

          if (notifError) {
            console.error('Notification creation error:', notifError);
          } else {
            notificationsCreated++;
          }
        }

        // Calculate next run time based on schedule pattern
        let nextRunAt = new Date(now);
        
        if (reminder.schedule_pattern.startsWith('0 9')) {
          // Monthly cron patterns (e.g., "0 9 5 * *" for 5th of month)
          const dayMatch = reminder.schedule_pattern.match(/0 9 (\d+) \* \*/);
          if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, day, 9, 0, 0);
          }
        } else if (reminder.schedule_pattern === 'on_date') {
          // One-time reminders (like IPC audits) - advance 6 months
          nextRunAt = new Date(now);
          nextRunAt.setMonth(nextRunAt.getMonth() + 6);
        }

        // Update reminder with new next_run_at
        const { error: updateError } = await supabaseAdmin
          .from('scheduled_reminders')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString(),
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error('Reminder update error:', updateError);
        } else {
          processedCount++;
        }

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }

    console.log(`Processed ${processedCount} reminders, created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        notifications_created: notificationsCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduled reminders error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
