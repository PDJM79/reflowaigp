// supabase/functions/create-user-accounts/index.ts
// JWT-protected - users with manage_users capability can create users in their practice

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient, createUserClientFromRequest } from '../_shared/supabase.ts';
import { requireCapability } from '../_shared/capabilities.ts';

interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  try {
    // Authenticate and get practice from JWT
    const { authUserId, practiceId } = await requireJwtAndPractice(req);

    // Verify user has manage_users capability
    const supabaseClient = createUserClientFromRequest(req);
    await requireCapability(
      supabaseClient,
      authUserId,
      'manage_users',
      'Unauthorized: manage_users capability required'
    );

    const { email, name, role, password }: CreateUserRequest = await req.json();

    const supabaseAdmin = createServiceClient();

    // SECURITY: Generate secure random password if not provided
    const securePassword = password || crypto.randomUUID();

    // Create user with secure password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: securePassword,
      email_confirm: true,
      user_metadata: {
        name,
        role
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return errorResponse(req, authError.message, 400);
    }

    // Create user record in users table (use JWT-derived practiceId)
    // NOTE: is_practice_manager flag is deprecated - use user_practice_roles via ensureUserPracticeRole below
    const { data: createdUser, error: userTableError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        name,
        practice_id: practiceId, // Use authenticated user's practice
        is_practice_manager: role === 'practice_manager' // DEPRECATED: kept for backward compatibility
      })
      .select('id')
      .single();

    if (userTableError) {
      console.error('User table error:', userTableError);
      // Clean up auth user if user table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(req, userTableError.message, 400);
    }

    // Create user contact details
    const { error: contactError } = await supabaseAdmin
      .from('user_contact_details')
      .insert({
        user_id: createdUser.id,
        email
      });

    if (contactError) {
      console.error('Contact details error:', contactError);
      // Clean up user and auth if contact insert fails
      await supabaseAdmin.from('users').delete().eq('id', createdUser.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(req, 'Failed to create user contact details', 400);
    }

    // Create user_practice_roles entry for the new role system
    // Import and use ensureUserPracticeRole for consistency
    try {
      // Find or create the role for this practice
      const { data: roleCatalogEntry } = await supabaseAdmin
        .from('role_catalog')
        .select('id')
        .eq('role_key', role)
        .single();

      if (roleCatalogEntry) {
        // Find or create the practice_role
        let practiceRoleId: string | null = null;
        
        const { data: existingPracticeRole } = await supabaseAdmin
          .from('practice_roles')
          .select('id')
          .eq('practice_id', practiceId)
          .eq('role_catalog_id', roleCatalogEntry.id)
          .single();

        if (existingPracticeRole) {
          practiceRoleId = existingPracticeRole.id;
        } else {
          // Create the practice role if it doesn't exist
          const { data: newPracticeRole } = await supabaseAdmin
            .from('practice_roles')
            .insert({
              practice_id: practiceId,
              role_catalog_id: roleCatalogEntry.id,
              is_active: true
            })
            .select('id')
            .single();
          practiceRoleId = newPracticeRole?.id || null;
        }

        if (practiceRoleId) {
          await supabaseAdmin
            .from('user_practice_roles')
            .insert({
              user_id: createdUser.id,
              practice_role_id: practiceRoleId
            });
          console.log(`Assigned role ${role} to user ${createdUser.id}`);
        }
      } else {
        console.warn(`Role '${role}' not found in role_catalog`);
      }
    } catch (roleError) {
      console.error('Error assigning role:', roleError);
      // Don't fail the whole operation - user is created, role assignment can be retried
    }

    // Return credentials so practice manager can send via their email client
    return jsonResponse(req, { 
      user_id: createdUser.id,
      auth_user_id: authUser.user.id,
      email: authUser.user.email,
      temporary_password: securePassword,
      message: 'User created successfully. Use the email button to send login details.'
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Function error:', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
};

serve(handler);
