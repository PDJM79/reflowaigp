// supabase/functions/generate-test-data/index.ts
// CRON job: Generates test data for development/testing
// Requires X-Job-Token header AND ALLOW_TEST_DATA=true environment variable
// This function is BLOCKED in production

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { ensureUserPracticeRole } from '../_shared/capabilities.ts';

serve(async (req) => {
  // No CORS for CRON jobs - not called from browser
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Require CRON secret
    requireCronSecret(req);

    // Environment gate: block in production
    const allowTestData = Deno.env.get('ALLOW_TEST_DATA');
    if (allowTestData !== 'true') {
      console.error('❌ ALLOW_TEST_DATA is not enabled - test data generation blocked');
      return new Response(
        JSON.stringify({ ok: false, error: 'Test data generation is disabled in this environment' }),
        { headers: { 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const supabaseAdmin = createServiceClient();

    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    
    // Find and delete ALL existing test practices (there might be duplicates)
    const { data: existingPractices } = await supabaseAdmin
      .from('practices')
      .select('id')
      .eq('name', 'Test Medical Centre');

    if (existingPractices && existingPractices.length > 0) {
      console.log(`Found ${existingPractices.length} existing test practice(s), deleting...`);
      
      // Use the migration approach to delete all related data
      for (const practice of existingPractices) {
        console.log('Deleting practice and all related data:', practice.id);
        
        // Delete in order to respect foreign key constraints
        await supabaseAdmin.from('temp_logs').delete().in('fridge_id', 
          (await supabaseAdmin.from('fridges').select('id').eq('practice_id', practice.id)).data?.map(f => f.id) || []
        );
        await supabaseAdmin.from('training_records').delete().in('employee_id',
          (await supabaseAdmin.from('employees').select('id').eq('practice_id', practice.id)).data?.map(e => e.id) || []
        );
        await supabaseAdmin.from('appraisals').delete().in('employee_id',
          (await supabaseAdmin.from('employees').select('id').eq('practice_id', practice.id)).data?.map(e => e.id) || []
        );
        await supabaseAdmin.from('leave_requests').delete().in('employee_id',
          (await supabaseAdmin.from('employees').select('id').eq('practice_id', practice.id)).data?.map(e => e.id) || []
        );
        await supabaseAdmin.from('employees').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('evidence_v2').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('form_submissions').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('tasks').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('task_templates').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('incidents').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('complaints').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('medical_requests').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('fridges').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('process_instances').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('score_current').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('score_snapshot').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('practice_targets').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('policy_documents').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('month_end_scripts').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('generated_reports').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('claim_runs').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('audit_logs').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('leave_policies').delete().eq('practice_id', practice.id);
        // Note: Skipping old user_roles and role_assignments tables - using user_practice_roles now
        await supabaseAdmin.from('user_practice_roles').delete().in('user_id',
          (await supabaseAdmin.from('users').select('id').eq('practice_id', practice.id)).data?.map(u => u.id) || []
        );
        
        // Delete user_auth_sensitive and user_contact_details for users in this practice
        const practiceUserIds = (await supabaseAdmin.from('users').select('id').eq('practice_id', practice.id)).data?.map(u => u.id) || [];
        if (practiceUserIds.length > 0) {
          await supabaseAdmin.from('user_auth_sensitive').delete().in('user_id', practiceUserIds);
          await supabaseAdmin.from('user_contact_details').delete().in('user_id', practiceUserIds);
        }
        
        await supabaseAdmin.from('users').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('organization_setup').delete().eq('practice_id', practice.id);
        await supabaseAdmin.from('practices').delete().eq('id', practice.id);
      }
    }

    // Delete ALL test auth users (including orphaned ones)
    const testEmails = [
      'manager@test.com', 'admin@test.com', 'nurselead@test.com',
      'cdleadgp@test.com', 'gp@test.com', 'nurse@test.com',
      'hca@test.com', 'receptionlead@test.com', 'reception@test.com'
    ];

    for (const email of testEmails) {
      try {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const matchingUsers = authUsers.users.filter(u => u.email === email);
        for (const existingUser of matchingUsers) {
          console.log('Deleting auth user:', email, existingUser.id);
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

      // Create users table record (without email - emails go in user_contact_details table)
      const { data: dbUser, error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: authUser.user.id,
          practice_id: practice.id,
          name: user.name,
          is_practice_manager: user.role === 'practice_manager',
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB error for', user.email, dbError);
        continue;
      }

      // Create user_contact_details entry with email
      const { error: contactError } = await supabaseAdmin
        .from('user_contact_details')
        .insert({
          user_id: dbUser.id,
          email: user.email,
          practice_id: practice.id
        });

      if (contactError) {
        console.error('Contact details error for', user.email, contactError);
      }

      // Note: Skipping old user_roles table - using user_practice_roles via ensureUserPracticeRole below

      // Create user_practice_roles entry for the new role system
      await ensureUserPracticeRole(supabaseAdmin, dbUser.id, practice.id, user.role);

      createdUsers.push({ ...dbUser, role: user.role });
      console.log('Created user:', user.email);
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
        steps: [
          { order: 1, description: 'Check vaccine fridge temperature is between 2-8°C', required: true },
          { order: 2, description: 'Record temperature on log sheet', required: true },
          { order: 3, description: 'Take photo of thermometer reading', required: true },
          { order: 4, description: 'Report any out-of-range readings immediately', required: true }
        ],
        evidence_hint: 'Take a photo of the fridge thermometer'
      },
      {
        practice_id: practice.id,
        name: 'Fire Safety Weekly Check',
        frequency: 'weekly',
        responsible_role: 'hca',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Check all fire extinguishers are in place and sealed', required: true },
          { order: 2, description: 'Test fire alarm panel', required: true },
          { order: 3, description: 'Ensure fire exits are clear and accessible', required: true },
          { order: 4, description: 'Check emergency lighting is functional', required: true },
          { order: 5, description: 'Document any issues found', required: true }
        ],
        evidence_hint: 'Check all fire extinguishers and alarms'
      },
      {
        practice_id: practice.id,
        name: 'Infection Control Monthly Audit',
        frequency: 'monthly',
        responsible_role: 'nurse_lead',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Review hand hygiene compliance records', required: true },
          { order: 2, description: 'Inspect clinical waste disposal procedures', required: true },
          { order: 3, description: 'Check PPE stock levels and expiry dates', required: true },
          { order: 4, description: 'Verify decontamination logs are up to date', required: true },
          { order: 5, description: 'Complete infection control checklist', required: true },
          { order: 6, description: 'Submit audit findings to practice manager', required: true }
        ],
        evidence_hint: 'Complete infection control checklist'
      },
      {
        practice_id: practice.id,
        name: 'Cleaning Standards Inspection',
        frequency: 'daily',
        responsible_role: 'reception',
        sla_hours: 24,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Inspect all consultation rooms for cleanliness', required: true },
          { order: 2, description: 'Check waiting area is clean and tidy', required: true },
          { order: 3, description: 'Verify bathroom facilities are sanitized', required: true },
          { order: 4, description: 'Ensure all surfaces have been wiped down', required: true },
          { order: 5, description: 'Report any cleaning issues to facilities team', required: false }
        ],
        evidence_hint: 'Verify all rooms are clean and sanitized'
      },
      {
        practice_id: practice.id,
        name: 'Staff Training Review',
        frequency: 'monthly',
        responsible_role: 'practice_manager',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Review mandatory training completion rates', required: true },
          { order: 2, description: 'Identify staff with expiring certificates', required: true },
          { order: 3, description: 'Schedule refresher training sessions', required: true },
          { order: 4, description: 'Update training records database', required: true },
          { order: 5, description: 'Send reminders to staff requiring training', required: true }
        ],
        evidence_hint: 'Review staff training records and certificates'
      },
      {
        practice_id: practice.id,
        name: 'Patient Records Audit',
        frequency: 'weekly',
        responsible_role: 'administrator',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Select random sample of 20 patient records', required: true },
          { order: 2, description: 'Check records are complete and accurate', required: true },
          { order: 3, description: 'Verify all entries are dated and signed', required: true },
          { order: 4, description: 'Ensure consent forms are properly filed', required: true },
          { order: 5, description: 'Document audit findings', required: true },
          { order: 6, description: 'Report any discrepancies to practice manager', required: true }
        ],
        evidence_hint: 'Audit patient record completeness'
      },
      {
        practice_id: practice.id,
        name: 'Prescription Review',
        frequency: 'daily',
        responsible_role: 'gp',
        sla_hours: 24,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Review all pending prescription requests', required: true },
          { order: 2, description: 'Check for drug interactions and contraindications', required: true },
          { order: 3, description: 'Verify dosage and duration are appropriate', required: true },
          { order: 4, description: 'Authorize or decline prescriptions with notes', required: true },
          { order: 5, description: 'Ensure urgent prescriptions are prioritized', required: true }
        ],
        evidence_hint: 'Review and sign off pending prescriptions'
      },
      {
        practice_id: practice.id,
        name: 'Clinical Governance Check',
        frequency: 'monthly',
        responsible_role: 'cd_lead_gp',
        sla_hours: 168,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Review significant event analysis reports', required: true },
          { order: 2, description: 'Check clinical audit completion status', required: true },
          { order: 3, description: 'Verify prescribing data is within acceptable ranges', required: true },
          { order: 4, description: 'Review patient safety incident reports', required: true },
          { order: 5, description: 'Assess compliance with NICE guidelines', required: true },
          { order: 6, description: 'Prepare governance report for partners meeting', required: true }
        ],
        evidence_hint: 'Review clinical governance compliance'
      },
      {
        practice_id: practice.id,
        name: 'Reception Area Check',
        frequency: 'daily',
        responsible_role: 'reception_lead',
        sla_hours: 24,
        start_date: tomorrow.toISOString().split('T')[0],
        steps: [
          { order: 1, description: 'Ensure reception desk is clean and organized', required: true },
          { order: 2, description: 'Check patient information leaflets are stocked', required: true },
          { order: 3, description: 'Verify signage is clear and visible', required: true },
          { order: 4, description: 'Test reception phone system', required: true },
          { order: 5, description: 'Ensure hand sanitizer is available', required: true }
        ],
        evidence_hint: 'Check reception area cleanliness and supplies'
      }
    ];

    console.log('About to insert templates. First template steps:', JSON.stringify(processTemplates[0].steps));
    console.log('First template full:', JSON.stringify(processTemplates[0]));

    const { data: createdTemplates, error: templatesError } = await supabaseAdmin
      .from('process_templates')
      .insert(processTemplates)
      .select();

    if (templatesError) {
      console.error('Error creating process templates:', templatesError);
      throw templatesError;
    }

    console.log('Created process templates:', createdTemplates?.length || 0);
    if (createdTemplates && createdTemplates.length > 0) {
      console.log('First created template steps:', JSON.stringify(createdTemplates[0].steps));
      console.log('First created template full:', JSON.stringify(createdTemplates[0]));
    }

    // Create initial process instances with proper assignments
    if (createdTemplates && createdTemplates.length > 0) {
      const instances = createdTemplates.map(template => {
        const dueDate = new Date(template.start_date);
        const periodEnd = new Date(dueDate);
        periodEnd.setHours(23, 59, 59, 999);

        // Find user with matching role to assign the task
        const assignedUser = createdUsers.find(u => u.role === template.responsible_role);

        return {
          template_id: template.id,
          practice_id: practice.id,
          assignee_id: assignedUser?.id || null,
          status: 'pending',
          period_start: template.start_date,
          period_end: periodEnd.toISOString(),
          due_at: dueDate.toISOString()
        };
      });

      const { error: instancesError } = await supabaseAdmin
        .from('process_instances')
        .insert(instances);
      
      if (instancesError) {
        console.error('Error creating process instances:', instancesError);
      } else {
        console.log('Created process instances:', instances.length);
      }
    }

    // Mark setup as complete
    await supabaseAdmin
      .from('organization_setup')
      .insert({
        practice_id: practice.id,
        setup_completed: true
      });

    // Seed practice targets
    const targetSections = [
      { section_key: null, target_score: 85 }, // Overall
      { section_key: 'FridgeTemps', target_score: 90 },
      { section_key: 'InfectionControlAudit', target_score: 85 },
      { section_key: 'Complaints', target_score: 85 },
      { section_key: 'HR_Training', target_score: 85 },
      { section_key: 'Policies', target_score: 85 },
      { section_key: 'FireRisk', target_score: 85 },
      { section_key: 'HSToolkit', target_score: 85 },
      { section_key: 'DailyCleaning', target_score: 85 },
      { section_key: 'Incidents', target_score: 80 },
      { section_key: 'MonthEndScripts', target_score: 80 },
      { section_key: 'EnhancedClaims', target_score: 80 },
      { section_key: 'InsuranceMedicals', target_score: 80 },
      { section_key: 'HR_Appraisals', target_score: 80 },
      { section_key: 'HR_Hiring', target_score: 80 },
    ];

    await supabaseAdmin
      .from('practice_targets')
      .insert(targetSections.map(t => ({
        practice_id: practice.id,
        ...t
      })));

    // Seed sample current scores
    const sampleScores = [
      { 
        section_key: 'Overall', 
        score: 78,
        contributors_json: {},
        gates_json: {}
      },
      { 
        section_key: 'FridgeTemps', 
        score: 72,
        contributors_json: { E: 95, C: 82, S: 88, R: 91, Q: 100, X: 50, N: 100 },
        gates_json: { active: ['CapUnresolvedExceptions'], reasons: ['2 out-of-range readings unresolved'] }
      },
      { 
        section_key: 'InfectionControlAudit', 
        score: 85,
        contributors_json: { E: 90, C: 100, S: 100, R: 85, Q: 95, X: 100, N: 80 },
        gates_json: {}
      },
      { 
        section_key: 'Complaints', 
        score: 69,
        contributors_json: { E: 92, C: 0, S: 60, R: 75, Q: 88, X: 80, N: 0 },
        gates_json: { active: ['CapLateCritical'], reasons: ['Acknowledgment on-time: 60%'] }
      },
      { 
        section_key: 'DailyCleaning', 
        score: 88,
        contributors_json: { E: 90, C: 95, S: 92, R: 85, Q: 90, X: 100, N: 0 },
        gates_json: {}
      },
      { 
        section_key: 'HR_Training', 
        score: 75,
        contributors_json: { E: 85, C: 80, S: 88, R: 70, Q: 90, X: 0, N: 65 },
        gates_json: {}
      },
    ];

    await supabaseAdmin
      .from('score_current')
      .insert(sampleScores.map(s => ({
        practice_id: practice.id,
        ...s
      })));

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
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 401 }
    );
  }
});
