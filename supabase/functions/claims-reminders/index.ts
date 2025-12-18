// supabase/functions/claims-reminders/index.ts
// CRON job: Sends claims reminders on 5th, 10th, 15th of month
// Requires X-Job-Token header for authentication (verify_jwt=false)

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

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
    console.log('💰 Claims Reminders CRON: Starting at 09:00 on 5th/10th/15th');

    const currentDate = new Date();
    const dayOfMonth = currentDate.getDate();

    if (![5, 10, 15].includes(dayOfMonth)) {
      console.log(`Today is ${dayOfMonth}, not a reminder day (5/10/15)`);
      return new Response(
        JSON.stringify({ ok: true, message: 'Not a reminder day' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

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

    for (const practice of practices || []) {
      // Get practice managers
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .eq('practice_id', practice.id)
        .eq('is_practice_manager', true)
        .eq('is_active', true);

      if (!managers || managers.length === 0) {
        console.log(`No practice managers found for ${practice.name}`);
        continue;
      }

      // Count active month-end scripts for current period
      const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { count } = await supabase
        .from('month_end_scripts')
        .select('*', { count: 'exact', head: true })
        .eq('practice_id', practice.id)
        .gte('issue_date', firstOfMonth.toISOString())
        .lte('issue_date', endOfMonth.toISOString())
        .is('removed', false);

      const scriptsCount = count || 0;

      const notifications = managers.map((manager: { id: string }) => ({
        practice_id: practice.id,
        user_id: manager.id,
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

    console.log('✅ Claims Reminders CRON: Completed', results);

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Claims Reminders CRON Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 401 }
    );
  }
});
