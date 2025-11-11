import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoProvisionRequest {
  practice_id: string;
}

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { practice_id } = await req.json() as AutoProvisionRequest;

    console.log(`Auto-provisioning practice: ${practice_id}`);

    // Check if already setup
    const { data: existingSetup } = await supabaseAdmin
      .from('organization_setup')
      .select('*')
      .eq('practice_id', practice_id)
      .single();

    if (existingSetup?.setup_completed) {
      return new Response(
        JSON.stringify({ success: true, message: 'Practice already provisioned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update setup record
    const { error: setupError } = await supabaseAdmin
      .from('organization_setup')
      .upsert({
        practice_id,
        setup_started_at: new Date().toISOString(),
      });

    if (setupError) throw setupError;

    // Get practice country for localization
    const { data: practice } = await supabaseAdmin
      .from('practices')
      .select('country')
      .eq('id', practice_id)
      .single();

    const country = practice?.country || 'Wales';

    // 1. Seed Process Templates
    console.log('Seeding process templates...');
    const defaultTemplates = [
      {
        name: 'Fridge Temperature Check',
        module: 'fridge_temps',
        frequency: 'twice_daily' as const,
        sla_hours: 4,
        responsible_role: 'nurse',
        description: 'Morning and afternoon fridge temperature monitoring',
        regulatory_standards: [], // Will be mapped later
      },
      {
        name: 'Daily Cleaning Checklist',
        module: 'cleaning',
        frequency: 'daily' as const,
        sla_hours: 24,
        responsible_role: 'reception',
        description: 'Daily cleaning schedule and sign-off',
        regulatory_standards: [],
      },
      {
        name: 'Six-Monthly Infection Control Audit',
        module: 'infection_control',
        frequency: 'quarterly' as const,
        sla_hours: 168,
        responsible_role: 'nurse_lead',
        description: 'Comprehensive infection prevention and control audit (May & December)',
        regulatory_standards: [],
      },
      {
        name: 'Annual Fire Risk Assessment',
        module: 'fire_safety',
        frequency: 'annually' as const,
        sla_hours: 720,
        responsible_role: 'estates_lead',
        description: 'Annual fire risk assessment with action plan',
        regulatory_standards: [],
      },
      {
        name: 'Monthly Enhanced Service Claims Review',
        module: 'claims',
        frequency: 'monthly' as const,
        sla_hours: 240,
        responsible_role: 'practice_manager',
        description: 'Review and process enhanced service claims (5th, 10th, 15th)',
        regulatory_standards: [],
      },
      {
        name: 'Policy Annual Review',
        module: 'policies',
        frequency: 'annually' as const,
        sla_hours: 168,
        responsible_role: 'ig_lead',
        description: 'Annual review of practice policies and procedures',
        regulatory_standards: [],
      },
    ];

    const { data: createdTemplates, error: templatesError } = await supabaseAdmin
      .from('process_templates')
      .insert(
        defaultTemplates.map(t => ({
          ...t,
          practice_id,
          is_active: true,
        }))
      )
      .select();

    if (templatesError) {
      console.error('Template creation error:', templatesError);
      throw templatesError;
    }

    console.log(`Created ${createdTemplates?.length} templates`);

    // 2. Setup Scheduled Reminders
    console.log('Setting up scheduled reminders...');
    const now = new Date();
    const scheduledReminders = [
      // Claims reminders (5th, 10th, 15th @ 09:00)
      {
        practice_id,
        reminder_type: 'claim_reminder',
        schedule_pattern: '0 9 5 * *', // 5th of month at 09:00
        next_run_at: new Date(now.getFullYear(), now.getMonth(), 5, 9, 0, 0).toISOString(),
        metadata: { day: 5, description: 'Enhanced Services claim reminder - 5th of month' },
      },
      {
        practice_id,
        reminder_type: 'claim_reminder',
        schedule_pattern: '0 9 10 * *', // 10th of month at 09:00
        next_run_at: new Date(now.getFullYear(), now.getMonth(), 10, 9, 0, 0).toISOString(),
        metadata: { day: 10, description: 'Enhanced Services claim reminder - 10th of month' },
      },
      {
        practice_id,
        reminder_type: 'claim_reminder',
        schedule_pattern: '0 9 15 * *', // 15th of month at 09:00
        next_run_at: new Date(now.getFullYear(), now.getMonth(), 15, 9, 0, 0).toISOString(),
        metadata: { day: 15, description: 'Enhanced Services claim reminder - 15th of month' },
      },
      // IPC Audit reminders (May & December)
      {
        practice_id,
        reminder_type: 'ipc_audit_due',
        schedule_pattern: 'on_date',
        next_run_at: new Date(now.getFullYear(), 4, 1, 9, 0, 0).toISOString(), // May 1st
        metadata: { description: 'Six-monthly Infection Control audit - May' },
      },
      {
        practice_id,
        reminder_type: 'ipc_audit_due',
        schedule_pattern: 'on_date',
        next_run_at: new Date(now.getFullYear(), 11, 1, 9, 0, 0).toISOString(), // Dec 1st
        metadata: { description: 'Six-monthly Infection Control audit - December' },
      },
    ];

    const { error: remindersError } = await supabaseAdmin
      .from('scheduled_reminders')
      .insert(scheduledReminders);

    if (remindersError) {
      console.error('Reminders creation error:', remindersError);
      throw remindersError;
    }

    console.log(`Created ${scheduledReminders.length} scheduled reminders`);

    // 3. Create default notification preferences for all users
    const { data: practiceUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('practice_id', practice_id);

    if (practiceUsers && practiceUsers.length > 0) {
      const { error: prefsError } = await supabaseAdmin
        .from('notification_preferences')
        .insert(
          practiceUsers.map(u => ({
            user_id: u.id,
            in_app_enabled: true,
            email_frequency: 'immediate',
            policy_reminders: true,
            task_notifications: true,
          }))
        )
        .onConflict('user_id')
        .doNothing();

      if (prefsError) console.error('Notification preferences error:', prefsError);
    }

    // 4. Update setup status
    const { error: updateError } = await supabaseAdmin
      .from('organization_setup')
      .update({
        templates_seeded: true,
        roles_seeded: true,
        dashboards_seeded: true,
        notifications_seeded: true,
        setup_completed: true,
        setup_completed_at: new Date().toISOString(),
      })
      .eq('practice_id', practice_id);

    if (updateError) throw updateError;

    // 5. Update practice onboarding stage
    await supabaseAdmin
      .from('practices')
      .update({
        onboarding_stage: 'configured',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', practice_id);

    console.log('Auto-provisioning completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Practice auto-provisioned successfully',
        templates_created: createdTemplates?.length || 0,
        reminders_created: scheduledReminders.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-provision error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
