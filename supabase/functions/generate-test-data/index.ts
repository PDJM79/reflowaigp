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

    // Clean up any existing test data
    console.log('Cleaning up existing test data...');
    
    // Find and delete existing test practice(s)
    const { data: existingPractices } = await supabaseAdmin
      .from('practices')
      .select('id')
      .eq('name', 'Test Medical Centre');

    if (existingPractices && existingPractices.length > 0) {
      for (const practice of existingPractices) {
        console.log('Deleting practice:', practice.id);
        await supabaseAdmin.from('practices').delete().eq('id', practice.id);
      }
    }

    // Delete test auth users
    const testEmails = [
      'manager@test.com', 'admin@test.com', 'nurselead@test.com',
      'cdleadgp@test.com', 'gp@test.com', 'nurse@test.com',
      'hca@test.com', 'receptionlead@test.com', 'reception@test.com'
    ];

    for (const email of testEmails) {
      try {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = authUsers.users.find(u => u.email === email);
        if (existingUser) {
          console.log('Deleting auth user:', email);
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        }
      } catch (error) {
        console.log('Error deleting user', email, error);
      }
    }

    console.log('Cleanup complete, creating fresh test data...');

    // Create test practice
    const { data: practice, error: practiceError } = await supabaseAdmin
      .from('practices')
      .insert({
        name: 'Test Medical Centre',
        address: '123 Health Street, London, UK',
        country: 'england',
        timezone: 'Europe/London'
      })
      .select()
      .single();

    if (practiceError) throw practiceError;

    console.log('Created practice:', practice.id);

    // Create test users with all available roles
    const testUsers = [
      { email: 'manager@test.com', password: 'Test123!!', role: 'practice_manager', name: 'Sarah Manager' },
      { email: 'admin@test.com', password: 'Test123!!', role: 'administrator', name: 'John Admin' },
      { email: 'nurselead@test.com', password: 'Test123!!', role: 'nurse_lead', name: 'Maria Lead' },
      { email: 'cdleadgp@test.com', password: 'Test123!!', role: 'cd_lead_gp', name: 'Dr. James Control' },
      { email: 'gp@test.com', password: 'Test123!!', role: 'gp', name: 'Dr. Emily Smith' },
      { email: 'nurse@test.com', password: 'Test123!!', role: 'nurse', name: 'Lisa Nurse' },
      { email: 'hca@test.com', password: 'Test123!!', role: 'hca', name: 'David Care' },
      { email: 'receptionlead@test.com', password: 'Test123!!', role: 'reception_lead', name: 'Anne Front' },
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
      
      // Create user_roles entry
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: dbUser.id,
          role: user.role,
          practice_id: practice.id
        });
    }

    if (createdUsers.length === 0) {
      throw new Error('No users were created successfully');
    }

    const practiceManager = createdUsers.find(u => u.role === 'practice_manager');
    const nurse = createdUsers.find(u => u.role === 'nurse');
    const admin = createdUsers.find(u => u.role === 'administrator');

    // Create default process templates with schedules
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const processTemplates = [
      {
        practice_id: practice.id,
        name: 'Fridge Temperature Check',
        frequency: 'twice_daily',
        responsible_role: 'nurse',
        sla_hours: 4,
        start_date: tomorrow.toISOString().split('T')[0],
        category: 'infection_control'
      },
      {
        practice_id: practice.id,
        name: 'Fire Safety Weekly Check',
        frequency: 'weekly',
        responsible_role: 'administrator',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        category: 'fire_safety'
      },
      {
        practice_id: practice.id,
        name: 'Infection Control Monthly Audit',
        frequency: 'monthly',
        responsible_role: 'nurse_lead',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        category: 'infection_control'
      },
      {
        practice_id: practice.id,
        name: 'Cleaning Standards Inspection',
        frequency: 'daily',
        responsible_role: 'administrator',
        sla_hours: 24,
        start_date: tomorrow.toISOString().split('T')[0],
        category: 'cleaning'
      }
    ];

    const { data: createdTemplates } = await supabaseAdmin
      .from('process_templates')
      .insert(processTemplates)
      .select();

    // Create initial process instances
    if (createdTemplates && createdTemplates.length > 0) {
      const instances = createdTemplates.map(template => {
        const dueDate = new Date(template.start_date);
        const periodEnd = new Date(dueDate);
        periodEnd.setHours(23, 59, 59, 999);

        return {
          template_id: template.id,
          practice_id: practice.id,
          status: 'pending',
          period_start: template.start_date,
          period_end: periodEnd.toISOString(),
          due_at: dueDate.toISOString()
        };
      });

      await supabaseAdmin
        .from('process_instances')
        .insert(instances);
    }

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
    if (fridges && fridges.length > 0 && nurse) {
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
    if (nurse) {
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
    }

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
    if (templates && templates.length > 0 && nurse) {
      const nurseLead = createdUsers.find(u => u.role === 'nurse_lead');
      
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
          ...(nurseLead ? [{
            practice_id: practice.id,
            template_id: templates[1].id,
            title: templates[1].title,
            description: templates[1].description,
            module: templates[1].module,
            assigned_to_user_id: nurseLead.id,
            due_at: new Date(Date.now() + 86400000 * 7).toISOString(),
            status: 'open',
            priority: 'medium',
            requires_photo: true
          }] : [])
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
