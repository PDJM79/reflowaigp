import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { ensureUserPracticeRole } from '../_shared/capabilities.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  try {
    // Validate JWT and get practice from user's membership
    const { practiceId } = await requireJwtAndPractice(req);

    console.log('[create-missing-accounts] Processing for practice:', practiceId);

    const supabase = createServiceClient();

    // Get all role assignments for this practice that don't have user accounts yet
    const { data: roleAssignments, error: roleError } = await supabase
      .from('role_assignments')
      .select('*')
      .eq('practice_id', practiceId)
      .is('user_id', null);

    if (roleError) {
      console.error('[create-missing-accounts] Error fetching role assignments:', roleError);
      throw roleError;
    }

    console.log('[create-missing-accounts] Found role assignments without accounts:', roleAssignments?.length || 0);

    const results = [];
    
    for (const assignment of roleAssignments || []) {
      try {
        console.log(`[create-missing-accounts] Creating account for ${assignment.assigned_email}`);
        
        // Create user with default password
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: assignment.assigned_email,
          password: 'Password',
          email_confirm: true,
          user_metadata: {
            name: assignment.assigned_name,
            role: assignment.role,
            force_password_change: true
          }
        });

        if (authError) {
          console.error(`[create-missing-accounts] Auth error for ${assignment.assigned_email}:`, authError);
          results.push({
            email: assignment.assigned_email,
            success: false,
            error: authError.message
          });
          continue;
        }

        // Create user record in users table
        // NOTE: is_practice_manager flag is deprecated - use user_practice_roles via ensureUserPracticeRole below
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: authUser.user.id,
            email: assignment.assigned_email,
            name: assignment.assigned_name,
            role: assignment.role,
            practice_id: practiceId,
            is_practice_manager: assignment.role === 'practice_manager' // DEPRECATED: kept for backward compatibility
          });

        if (userError) {
          console.error(`[create-missing-accounts] User table error for ${assignment.assigned_email}:`, userError);
          // Clean up auth user if user table insert fails
          await supabase.auth.admin.deleteUser(authUser.user.id);
          results.push({
            email: assignment.assigned_email,
            success: false,
            error: userError.message
          });
          continue;
        }

        // Update the role assignment with the user_id
        const { error: updateError } = await supabase
          .from('role_assignments')
          .update({ user_id: authUser.user.id })
          .eq('id', assignment.id);

        if (updateError) {
          console.error(`[create-missing-accounts] Error updating role assignment for ${assignment.assigned_email}:`, updateError);
        }

        // Create user_practice_roles entry for the new role system
        // Use the users table id (dbUser equivalent) which we need to get
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', authUser.user.id)
          .single();

        if (userRecord) {
          await ensureUserPracticeRole(supabase, userRecord.id, practiceId, assignment.role);
        }

        results.push({
          email: assignment.assigned_email,
          name: assignment.assigned_name,
          role: assignment.role,
          success: true,
          user_id: authUser.user.id
        });

        console.log(`[create-missing-accounts] Successfully created account for ${assignment.assigned_email}`);
        
      } catch (error: any) {
        console.error(`[create-missing-accounts] Error creating account for ${assignment.assigned_email}:`, error);
        results.push({
          email: assignment.assigned_email,
          success: false,
          error: error.message
        });
      }
    }

    return jsonResponse(req, { 
      message: `Processed ${results.length} role assignments`,
      results
    });

  } catch (error) {
    console.error('[create-missing-accounts] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Missing') || message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
});
