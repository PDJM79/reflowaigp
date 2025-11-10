import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateProcessesRequest {
  practice_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { practice_id }: CreateProcessesRequest = await req.json();

    console.log('Creating initial processes for practice:', practice_id);

    // Get all process templates for this practice
    const { data: templates, error: templatesError } = await supabaseClient
      .from('process_templates')
      .select('*')
      .eq('practice_id', practice_id)
      .eq('active', true);

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      throw templatesError;
    }

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No templates found for this practice' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get all users in this practice with their roles from user_roles table
    const { data: practiceUsers, error: usersError } = await supabaseClient
      .from('users')
      .select(`
        id,
        user_roles!inner(role)
      `)
      .eq('practice_id', practice_id)
      .eq('is_active', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    if (!practiceUsers || practiceUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No users found for this practice' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const now = new Date();
    const processInstances = [];

    // Create process instances for each template
    for (const template of templates) {
      // Find users with matching roles for this template
      const assignedUsers = practiceUsers.filter(user => 
        Array.isArray(user.user_roles) && user.user_roles.some((r: any) => r.role === template.responsible_role)
      );
      
      // If no specific user found, assign to practice manager
      const targetUsers = assignedUsers.length > 0 ? assignedUsers : 
        practiceUsers.filter(user => 
          Array.isArray(user.user_roles) && user.user_roles.some((r: any) => r.role === 'practice_manager')
        );

      for (const user of targetUsers) {
        // Calculate due date based on frequency
        let dueDate = new Date(now);
        switch (template.frequency) {
          case 'daily':
            dueDate.setDate(now.getDate() + 1);
            break;
          case 'weekly':
            dueDate.setDate(now.getDate() + 7);
            break;
          case 'monthly':
            dueDate.setMonth(now.getMonth() + 1);
            break;
          case 'quarterly':
            dueDate.setMonth(now.getMonth() + 3);
            break;
          default:
            dueDate.setDate(now.getDate() + 7); // Default to weekly
        }

        processInstances.push({
          template_id: template.id,
          practice_id: practice_id,
          assignee_id: user.id,
          status: 'pending',
          period_start: now.toISOString(),
          period_end: dueDate.toISOString(),
          due_at: dueDate.toISOString()
        });
      }
    }

    console.log(`Creating ${processInstances.length} process instances`);

    // Insert process instances
    const { data: instances, error: instancesError } = await supabaseClient
      .from('process_instances')
      .insert(processInstances)
      .select();

    if (instancesError) {
      console.error('Error creating process instances:', instancesError);
      throw instancesError;
    }

    // Create step instances for each process instance
    const stepInstances = [];
    for (const instance of instances) {
      const template = templates.find(t => t.id === instance.template_id);
      if (template && template.steps) {
        template.steps.forEach((step: any, index: number) => {
          stepInstances.push({
            process_instance_id: instance.id,
            step_index: index,
            title: step.title,
            status: 'pending'
          });
        });
      }
    }

    console.log(`Creating ${stepInstances.length} step instances`);

    // Insert step instances
    if (stepInstances.length > 0) {
      const { error: stepError } = await supabaseClient
        .from('step_instances')
        .insert(stepInstances);

      if (stepError) {
        console.error('Error creating step instances:', stepError);
        throw stepError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        process_instances_created: processInstances.length,
        step_instances_created: stepInstances.length,
        message: `Created ${processInstances.length} process instances with ${stepInstances.length} steps`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in create-initial-processes function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);