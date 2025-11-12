import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Practice {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('IPC Schedule CRON: Starting May/December audit generation');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    // Only run in May (5) or December (12)
    if (currentMonth !== 5 && currentMonth !== 12) {
      console.log(`Current month is ${currentMonth}, skipping (only runs in May/December)`);
      return new Response(
        JSON.stringify({ message: 'Not May or December, skipping' }),
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

    for (const practice of (practices as Practice[])) {
      // Check if audit already exists for this period
      const { data: existing } = await supabase
        .from('ipc_audits')
        .select('id')
        .eq('practice_id', practice.id)
        .eq('period_month', currentMonth)
        .eq('period_year', currentDate.getFullYear())
        .maybeSingle();

      if (existing) {
        console.log(`IPC audit already exists for ${practice.name} in ${currentMonth}/${currentDate.getFullYear()}`);
        results.push({ practice: practice.name, status: 'already_exists' });
        continue;
      }

      // Create new audit
      const { data: newAudit, error: auditError } = await supabase
        .from('ipc_audits')
        .insert({
          practice_id: practice.id,
          period_month: currentMonth,
          period_year: currentDate.getFullYear(),
          location_scope: 'whole_practice',
          status: 'pending'
        })
        .select()
        .single();

      if (auditError) {
        console.error(`Error creating audit for ${practice.name}:`, auditError);
        results.push({ practice: practice.name, status: 'error', error: auditError.message });
        continue;
      }

      console.log(`Created IPC audit ${newAudit.id} for ${practice.name}`);

      // Send notification to practice managers and IPC leads
      const { data: targetUsers } = await supabase
        .from('users')
        .select('id')
        .eq('practice_id', practice.id)
        .eq('is_active', true);

      if (targetUsers && targetUsers.length > 0) {
        const notifications = targetUsers.map((user: { id: string }) => ({
          practice_id: practice.id,
          user_id: user.id,
          notification_type: 'ipc_audit_due',
          priority: 'high',
          title: `IPC Audit Due - ${currentMonth === 5 ? 'May' : 'December'} ${currentDate.getFullYear()}`,
          message: `Six-monthly IPC audit has been scheduled. Please complete the audit checklist and action plan.`,
          action_url: '/ipc'
        }));

        await supabase.from('notifications').insert(notifications);
      }

      results.push({ practice: practice.name, status: 'created', audit_id: newAudit.id });
    }

    console.log('IPC Schedule CRON: Completed', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('IPC Schedule CRON Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
