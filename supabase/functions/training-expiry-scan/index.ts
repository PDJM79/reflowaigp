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

    console.log('Training Expiry Scan CRON: Starting daily scan');

    const currentDate = new Date();
    const thirtyDaysFromNow = new Date(currentDate);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const sixtyDaysFromNow = new Date(currentDate);
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const ninetyDaysFromNow = new Date(currentDate);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    // Get all training records expiring within 90 days
    const { data: expiringRecords, error: recordsError } = await supabase
      .from('training_records')
      .select(`
        *,
        employee:employees(id, name, practice_id),
        training_type:training_types(title, is_mandatory)
      `)
      .lte('expiry_date', ninetyDaysFromNow.toISOString())
      .or('reminder_sent_at.is.null,reminder_sent_at.lt.' + thirtyDaysFromNow.toISOString());

    if (recordsError) {
      console.error('Error fetching expiring records:', recordsError);
      throw recordsError;
    }

    console.log(`Found ${expiringRecords?.length || 0} expiring training records`);

    const results = [];

    for (const record of expiringRecords || []) {
      const expiryDate = new Date(record.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'urgent' | 'high' | 'medium' = 'medium';
      let message = '';

      if (daysUntilExpiry <= 30) {
        priority = 'urgent';
        message = `Training certificate "${record.training_type.title}" expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 60) {
        priority = 'high';
        message = `Training certificate "${record.training_type.title}" expires in ${daysUntilExpiry} days`;
      } else {
        message = `Training certificate "${record.training_type.title}" expires in ${daysUntilExpiry} days`;
      }

      // Get practice managers for this practice
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .eq('practice_id', record.employee.practice_id)
        .eq('is_active', true);

      if (managers && managers.length > 0) {
        // Send notification to managers
        const notifications = managers.map((manager: { id: string }) => ({
          practice_id: record.employee.practice_id,
          user_id: manager.id,
          notification_type: 'training_expiry_warning',
          priority,
          title: 'Training Certificate Expiring',
          message: `${record.employee.name}: ${message}`,
          action_url: '/hr'
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Update reminder_sent_at
      await supabase
        .from('training_records')
        .update({ reminder_sent_at: currentDate.toISOString() })
        .eq('id', record.id);

      results.push({
        employee: record.employee.name,
        training: record.training_type.title,
        days_until_expiry: daysUntilExpiry,
        priority,
        status: 'notified'
      });
    }

    console.log('Training Expiry Scan CRON: Completed', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Training Expiry Scan CRON Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
