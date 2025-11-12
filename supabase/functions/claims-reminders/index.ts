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

    console.log('Claims Reminders CRON: Starting at 09:00 on 5th/10th/15th');

    const currentDate = new Date();
    const dayOfMonth = currentDate.getDate();

    // Only run on 5th, 10th, or 15th
    if (![5, 10, 15].includes(dayOfMonth)) {
      console.log(`Today is ${dayOfMonth}, not a reminder day (5/10/15)`);
      return new Response(
        JSON.stringify({ message: 'Not a reminder day' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get all active practices
    const { data: practices, error: practicesError } = await supabase
      .from('practices')
      .select('id, name')
      .eq('is_active', true);

    if (practicesError) {
      console.error('Error fetching practices:', practicesError);
      throw practicesError;
    }

    console.log(`Found ${practices?.length || 0} active practices`);

    const results = [];

    for (const practice of practices) {
      // Get practice managers
      const { data: managers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'practice_manager')
        .in('user_id', 
          supabase
            .from('users')
            .select('id')
            .eq('practice_id', practice.id)
            .eq('is_active', true)
        );

      if (!managers || managers.length === 0) {
        console.log(`No practice managers found for ${practice.name}`);
        continue;
      }

      // Count active month-end scripts for current period
      const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: scriptsData, count } = await supabase
        .from('month_end_scripts')
        .select('*', { count: 'exact', head: true })
        .eq('practice_id', practice.id)
        .gte('issue_date', firstOfMonth.toISOString())
        .lte('issue_date', endOfMonth.toISOString())
        .is('removed', false);

      const scriptsCount = count || 0;

      // Send in-app notification to practice managers
      const notifications = managers.map((manager: { user_id: string }) => ({
        practice_id: practice.id,
        user_id: manager.user_id,
        notification_type: 'claims_reminder',
        priority: 'high',
        title: `Enhanced Service Claims Reminder - ${dayOfMonth}th`,
        message: `Review and process claims for this month. ${scriptsCount} scripts recorded so far.`,
        action_url: '/claims'
      }));

      await supabase.from('notifications').insert(notifications);

      results.push({
        practice: practice.name,
        day: dayOfMonth,
        scripts_count: scriptsCount,
        managers_notified: managers.length,
        status: 'notified'
      });
    }

    console.log('Claims Reminders CRON: Completed', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Claims Reminders CRON Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
