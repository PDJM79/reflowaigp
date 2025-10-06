import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create test practice
    const { data: practice, error: practiceError } = await supabaseAdmin
      .from('practices')
      .insert({
        name: 'Test Medical Centre',
        address: '123 Health Street, London, UK',
        country: 'GB',
        timezone: 'Europe/London'
      })
      .select()
      .single();

    if (practiceError) throw practiceError;

    console.log('Created practice:', practice.id);

    // Create test users with different roles
    const testUsers = [
      { email: 'manager@test.com', password: 'Test123!!', role: 'practice_manager', name: 'Sarah Manager' },
      { email: 'admin@test.com', password: 'Test123!!', role: 'administrator', name: 'John Admin' },
      { email: 'gp@test.com', password: 'Test123!!', role: 'gp', name: 'Dr. Emily Smith' },
      { email: 'nurse@test.com', password: 'Test123!!', role: 'nurse', name: 'Lisa Nurse' },
      { email: 'nurselead@test.com', password: 'Test123!!', role: 'nurse_lead', name: 'Maria Lead' },
      { email: 'reception@test.com', password: 'Test123!!', role: 'reception', name: 'Tom Reception' },
    ];

    const createdUsers = [];

    for (const user of testUsers) {
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name }
      });

      if (authError) {
        console.error('Auth error for', user.email, authError);
        continue;
      }

      // Create users table record
      const { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: authUser.user.id,
          practice_id: practice.id,
          role: user.role,
          name: user.name,
          email: user.email,
          is_practice_manager: user.role === 'practice_manager',
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB error for', user.email, dbError);
        continue;
      }

      createdUsers.push(dbUser);
      console.log('Created user:', user.email);
    }

    const practiceManager = createdUsers.find(u => u.role === 'practice_manager');
    const nurse = createdUsers.find(u => u.role === 'nurse');
    const admin = createdUsers.find(u => u.role === 'administrator');

    // Mark setup as complete
    await supabaseAdmin
      .from('organization_setup')
      .insert({
        practice_id: practice.id,
        setup_completed: true
      });

    // Create fridges
    const { data: fridges } = await supabaseAdmin
      .from('fridges')
      .insert([
        { practice_id: practice.id, name: 'Vaccine Fridge A', location: 'Treatment Room 1', min_temp: 2, max_temp: 8 },
        { practice_id: practice.id, name: 'Vaccine Fridge B', location: 'Treatment Room 2', min_temp: 2, max_temp: 8 }
      ])
      .select();

    // Create temp logs
    if (fridges && fridges.length > 0) {
      const tempLogs = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        tempLogs.push({
          fridge_id: fridges[0].id,
          log_date: date.toISOString().split('T')[0],
          log_time: '09:00:00',
          reading: 4 + Math.random() * 2,
          recorded_by: nurse.id,
          breach_flag: false
        });
      }
      await supabaseAdmin.from('temp_logs').insert(tempLogs);
    }

    // Create incidents
    await supabaseAdmin
      .from('incidents')
      .insert([
        {
          practice_id: practice.id,
          incident_date: new Date().toISOString(),
          description: 'Patient slip in waiting room',
          location: 'Waiting Room',
          rag: 'amber',
          reported_by: nurse.id,
          themes: ['slips_trips_falls'],
          status: 'open'
        },
        {
          practice_id: practice.id,
          incident_date: new Date(Date.now() - 86400000 * 2).toISOString(),
          description: 'Sharps disposal bin full',
          location: 'Treatment Room 1',
          rag: 'green',
          reported_by: nurse.id,
          themes: ['waste_management'],
          status: 'closed'
        }
      ]);

    // Create complaints
    await supabaseAdmin
      .from('complaints')
      .insert([
        {
          practice_id: practice.id,
          description: 'Long wait time for appointment',
          received_at: new Date().toISOString(),
          ack_due: new Date(Date.now() + 86400000 * 3).toISOString(),
          final_due: new Date(Date.now() + 86400000 * 20).toISOString(),
          channel: 'email',
          status: 'new',
          assigned_to: admin?.id
        }
      ]);

    // Create medical requests
    await supabaseAdmin
      .from('medical_requests')
      .insert([
        {
          practice_id: practice.id,
          request_type: 'insurance_report',
          received_at: new Date().toISOString(),
          status: 'received',
          notes: 'Insurance report for patient medical history'
        },
        {
          practice_id: practice.id,
          request_type: 'sar',
          received_at: new Date(Date.now() - 86400000).toISOString(),
          status: 'in_progress',
          notes: 'Subject access request - full medical records'
        }
      ]);

    // Create task templates
    const { data: templates } = await supabaseAdmin
      .from('task_templates')
      .insert([
        {
          practice_id: practice.id,
          title: 'Daily Room Check',
          description: 'Check all treatment rooms are clean and stocked',
          module: 'cleaning',
          default_assignee_role: 'nurse',
          requires_photo: true,
          sla_type: 'daily',
          allowed_roles: ['nurse', 'nurse_lead']
        },
        {
          practice_id: practice.id,
          title: 'Infection Control Audit',
          description: 'Monthly infection control compliance audit',
          module: 'infection_control',
          default_assignee_role: 'nurse_lead',
          requires_photo: true,
          sla_type: 'monthly',
          allowed_roles: ['nurse_lead', 'practice_manager']
        }
      ])
      .select();

    // Create tasks
    if (templates && templates.length > 0) {
      await supabaseAdmin
        .from('tasks')
        .insert([
          {
            practice_id: practice.id,
            template_id: templates[0].id,
            title: templates[0].title,
            description: templates[0].description,
            module: templates[0].module,
            assigned_to_user_id: nurse.id,
            due_at: new Date(Date.now() + 86400000).toISOString(),
            status: 'open',
            priority: 'high',
            requires_photo: true
          },
          {
            practice_id: practice.id,
            template_id: templates[1].id,
            title: templates[1].title,
            description: templates[1].description,
            module: templates[1].module,
            assigned_to_user_id: createdUsers.find(u => u.role === 'nurse_lead')?.id,
            due_at: new Date(Date.now() + 86400000 * 7).toISOString(),
            status: 'open',
            priority: 'medium',
            requires_photo: true
          }
        ]);
    }

    // Create employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .insert(
        createdUsers.map(user => ({
          practice_id: practice.id,
          user_id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          start_date: '2024-01-01'
        }))
      )
      .select();

    // Create policy documents
    await supabaseAdmin
      .from('policy_documents')
      .insert([
        {
          practice_id: practice.id,
          title: 'Infection Prevention and Control Policy',
          version: '2.1',
          effective_from: '2024-01-01',
          review_due: '2025-01-01',
          owner_role: 'nurse_lead',
          status: 'active',
          source: 'local'
        },
        {
          practice_id: practice.id,
          title: 'Health & Safety Policy',
          version: '1.5',
          effective_from: '2024-01-01',
          review_due: '2025-01-01',
          owner_role: 'practice_manager',
          status: 'active',
          source: 'local'
        }
      ]);

    return new Response(
      JSON.stringify({
        success: true,
        practice: {
          id: practice.id,
          name: practice.name
        },
        users: testUsers.map(u => ({
          email: u.email,
          password: u.password,
          role: u.role
        })),
        message: 'Test data generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating test data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
