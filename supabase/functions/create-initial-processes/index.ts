import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  try {
    // Validate JWT and get practice from user's membership
    const { practiceId } = await requireJwtAndPractice(req);

    console.log('[create-initial-processes] Creating processes for practice:', practiceId);

    const supabase = createServiceClient();

    // Get all process templates for this practice
    const { data: templates, error: templatesError } = await supabase
      .from('process_templates')
      .select('*')
      .eq('practice_id', practiceId)
      .eq('active', true);

    if (templatesError) {
      console.error('[create-initial-processes] Error fetching templates:', templatesError);
      throw templatesError;
    }

    if (!templates || templates.length === 0) {
      return jsonResponse(req, { error: 'No templates found for this practice' }, 404);
    }

    // Get all users in this practice with their roles from user_practice_roles -> role_catalog
    const { data: practiceUsers, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        user_practice_roles(
          practice_roles(
            role_catalog(role_key)
          )
        )
      `)
      .eq('practice_id', practiceId)
      .eq('is_active', true);

    if (usersError) {
      console.error('[create-initial-processes] Error fetching users:', usersError);
      throw usersError;
    }

    if (!practiceUsers || practiceUsers.length === 0) {
      return jsonResponse(req, { error: 'No users found for this practice' }, 404);
    }

    const now = new Date();
    const processInstances = [];

    // Helper to check if user has a specific role
    const userHasRole = (user: any, roleKey: string): boolean => {
      return user.user_practice_roles?.some((upr: any) => 
        upr.practice_roles?.role_catalog?.role_key === roleKey
      ) ?? false;
    };

    // Create process instances for each template
    for (const template of templates) {
      // Find users with matching roles for this template
      const assignedUsers = practiceUsers.filter(user => 
        userHasRole(user, template.responsible_role)
      );
      
      // If no specific user found, assign to practice manager
      const targetUsers = assignedUsers.length > 0 ? assignedUsers : 
        practiceUsers.filter(user => userHasRole(user, 'practice_manager'));

      for (const user of targetUsers) {
        // Calculate due date based on frequency
        const dueDate = new Date(now);
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
          practice_id: practiceId,
          assignee_id: user.id,
          status: 'pending',
          period_start: now.toISOString(),
          period_end: dueDate.toISOString(),
          due_at: dueDate.toISOString()
        });
      }
    }

    console.log(`[create-initial-processes] Creating ${processInstances.length} process instances`);

    // Insert process instances
    const { data: instances, error: instancesError } = await supabase
      .from('process_instances')
      .insert(processInstances)
      .select();

    if (instancesError) {
      console.error('[create-initial-processes] Error creating process instances:', instancesError);
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

    console.log(`[create-initial-processes] Creating ${stepInstances.length} step instances`);

    // Insert step instances
    if (stepInstances.length > 0) {
      const { error: stepError } = await supabase
        .from('step_instances')
        .insert(stepInstances);

      if (stepError) {
        console.error('[create-initial-processes] Error creating step instances:', stepError);
        throw stepError;
      }
    }

    return jsonResponse(req, { 
      success: true,
      process_instances_created: processInstances.length,
      step_instances_created: stepInstances.length,
      message: `Created ${processInstances.length} process instances with ${stepInstances.length} steps`
    });

  } catch (error) {
    console.error('[create-initial-processes] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Missing') || message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
});
