// supabase/functions/reset-user-password/index.ts
// JWT-protected - users with manage_users capability can reset passwords for users in their practice

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient, createUserClientFromRequest } from '../_shared/supabase.ts';
import { requireCapability } from '../_shared/capabilities.ts';

interface ResetPasswordRequest {
  email: string;
  newPassword: string;
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

    const { email, newPassword }: ResetPasswordRequest = await req.json();

    console.log(`Attempting to reset password for user: ${email}`);

    const supabaseAdmin = createServiceClient();

    // Find the user by email in user_contact_details and verify they belong to the same practice
    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('user_contact_details')
      .select('user_id, users(auth_user_id, practice_id)')
      .eq('email', email)
      .single();
    
    if (contactError || !contactData) {
      console.error('User not found:', contactError);
      return errorResponse(req, `User with email ${email} not found`, 404);
    }

    // SECURITY: Verify target user belongs to the same practice
    const targetUser = contactData.users as { auth_user_id: string; practice_id: string };
    if (targetUser.practice_id !== practiceId) {
      console.error('Practice mismatch - access denied');
      return errorResponse(req, 'Unauthorized: Cannot reset password for users in other practices', 403);
    }

    const authUserId_target = targetUser.auth_user_id;
    
    if (!authUserId_target) {
      console.error(`Auth user ID not found for email: ${email}`);
      return errorResponse(req, 'User account error', 404);
    }

    // Reset the user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId_target,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return errorResponse(req, updateError.message, 400);
    }

    console.log(`Successfully reset password for user: ${email}`);

    return jsonResponse(req, { 
      message: `Password successfully reset for ${email}`,
      user_id: updatedUser.user.id,
      email: updatedUser.user.email
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Function error:', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
};

serve(handler);
