// supabase/functions/complaints-sla-scan/index.ts
// CRON job: Scans complaints for SLA breaches on weekdays
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

    const supabase = createServiceClient();
    console.log('📋 Complaints SLA Scan CRON: Starting weekday scan');

    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend - skipping SLA scan');
      return new Response(
        JSON.stringify({ ok: true, message: 'Weekend, no scan needed' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('*')
      .neq('status', 'resolved')
      .not('ack_due', 'is', null);

    if (complaintsError) {
      console.error('Error fetching complaints:', complaintsError);
      throw complaintsError;
    }

    console.log(`Found ${complaints?.length || 0} open complaints`);

    const results = [];

    for (const complaint of complaints || []) {
      const ackDue = complaint.ack_due ? new Date(complaint.ack_due) : null;
      const finalDue = complaint.final_due ? new Date(complaint.final_due) : null;
      
      let newStatus = complaint.status;
      let needsNotification = false;

      // Check acknowledgment SLA
      if (ackDue && !complaint.ack_sent_at) {
        const hoursUntilAckDue = (ackDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
        
        if (currentDate > ackDue) {
          newStatus = 'overdue';
          needsNotification = true;
        } else if (hoursUntilAckDue <= 24) {
          newStatus = 'at_risk';
          needsNotification = true;
        }
      }

      // Check final response SLA
      if (finalDue && complaint.ack_sent_at && !complaint.final_sent_at) {
        const daysUntilFinalDue = (finalDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (currentDate > finalDue) {
          newStatus = 'overdue';
          needsNotification = true;
        } else if (daysUntilFinalDue <= 5) {
          newStatus = 'at_risk';
          needsNotification = true;
        }
      }

      // Update complaint status if changed
      if (newStatus !== complaint.status) {
        await supabase
          .from('complaints')
          .update({ status: newStatus })
          .eq('id', complaint.id);
      }

      // Send notification if needed
      if (needsNotification) {
        // Get practice managers using role system with fallback
        const managers = await getPracticeManagersForPractice(supabase, complaint.practice_id);

        if (managers.length > 0) {
          const notifications = managers.map((manager) => ({
            practice_id: complaint.practice_id,
            user_id: manager.id,
            notification_type: 'complaint_sla_alert',
            priority: newStatus === 'overdue' ? 'urgent' : 'high',
            title: `Complaint SLA ${newStatus === 'overdue' ? 'Overdue' : 'At Risk'}`,
            message: `Complaint #${complaint.id.substring(0, 8)} is ${newStatus}. Action required.`,
            action_url: `/complaints`
          }));

          await supabase.from('notifications').insert(notifications);
        }

        results.push({
          complaint_id: complaint.id.substring(0, 8),
          status: newStatus,
          action: 'notified'
        });
      }
    }

    console.log('✅ Complaints SLA Scan CRON: Completed', results);

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Complaints SLA Scan CRON Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 401 }
    );
  }
});
