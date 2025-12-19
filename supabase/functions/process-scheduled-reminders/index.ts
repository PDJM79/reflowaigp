// supabase/functions/process-scheduled-reminders/index.ts
// CRON job: Processes scheduled reminders and sends notifications
// Requires X-Job-Token header for authentication (verify_jwt=false)

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { getPracticeManagersForPractice } from '../_shared/capabilities.ts';

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    requireCronSecret(req);

    const supabaseAdmin = createServiceClient();
    console.log('⏰ Processing scheduled reminders...');
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
        JSON.stringify({ ok: true, message: 'No reminders due', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueReminders.length} due reminders`);

    let processedCount = 0;
    let notificationsCreated = 0;

    for (const reminder of dueReminders) {
      try {
        // Get practice managers using role system with fallback
        const practiceManagers = await getPracticeManagersForPractice(supabaseAdmin, reminder.practice_id);

        if (practiceManagers.length === 0) {
          console.log(`No practice managers found for practice ${reminder.practice_id}`);
          continue;
        }

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

        let nextRunAt = new Date(now);
        
        if (reminder.schedule_pattern.startsWith('0 9')) {
          const dayMatch = reminder.schedule_pattern.match(/0 9 (\d+) \* \*/);
          if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            nextRunAt = new Date(now.getFullYear(), now.getMonth() + 1, day, 9, 0, 0);
          }
        } else if (reminder.schedule_pattern === 'on_date') {
          nextRunAt = new Date(now);
          nextRunAt.setMonth(nextRunAt.getMonth() + 6);
        }

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

    console.log(`✅ Processed ${processedCount} reminders, created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: processedCount,
        notifications_created: notificationsCreated,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Scheduled reminders error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
