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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Complaints SLA Scan CRON: Starting weekday scan');

    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();

    // Only run Monday-Friday (1-5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log('Weekend - skipping SLA scan');
      return new Response(
        JSON.stringify({ message: 'Weekend, no scan needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get all open complaints
    const { data: complaints, error: complaintsError } = await supabase
      .from('complaints')
      .select('*')
      .neq('sla_status', 'completed')
      .not('acknowledgment_due_date', 'is', null);

    if (complaintsError) {
      console.error('Error fetching complaints:', complaintsError);
      throw complaintsError;
    }

    console.log(`Found ${complaints?.length || 0} open complaints`);

    const results = [];

    for (const complaint of complaints || []) {
      const ackDue = complaint.acknowledgment_due_date ? new Date(complaint.acknowledgment_due_date) : null;
      const finalDue = complaint.final_response_due_date ? new Date(complaint.final_response_due_date) : null;
      
      let newStatus = complaint.sla_status;
      let needsNotification = false;

      // Check acknowledgment SLA
      if (ackDue && !complaint.acknowledged_at) {
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
      if (finalDue && complaint.acknowledged_at && !complaint.resolved_at) {
        const daysUntilFinalDue = (finalDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (currentDate > finalDue) {
          newStatus = 'overdue';
          needsNotification = true;
        } else if (daysUntilFinalDue <= 5) {
          newStatus = 'at_risk';
          needsNotification = true;
        }
      }

      // Update complaint SLA status if changed
      if (newStatus !== complaint.sla_status) {
        await supabase
          .from('complaints')
          .update({ sla_status: newStatus })
          .eq('id', complaint.id);
      }

      // Send notification if needed
      if (needsNotification) {
        const { data: managers } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'practice_manager')
          .in('user_id', 
            supabase
              .from('users')
              .select('id')
              .eq('practice_id', complaint.practice_id)
              .eq('is_active', true)
          );

        if (managers && managers.length > 0) {
          const notifications = managers.map((manager: { user_id: string }) => ({
            practice_id: complaint.practice_id,
            user_id: manager.user_id,
            notification_type: 'complaint_sla_alert',
            priority: newStatus === 'overdue' ? 'urgent' : 'high',
            title: `Complaint SLA ${newStatus === 'overdue' ? 'Overdue' : 'At Risk'}`,
            message: `Complaint #${complaint.id.substring(0, 8)} is ${newStatus}. Action required.`,
            action_url: `/complaints/${complaint.id}`
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

    console.log('Complaints SLA Scan CRON: Completed', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Complaints SLA Scan CRON Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
