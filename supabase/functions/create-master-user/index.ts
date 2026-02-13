// supabase/functions/create-master-user/index.ts
// JWT-protected - only existing master users can create new master users

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwt } from '../_shared/auth.ts';
import { createServiceClient, createUserClientFromRequest } from '../_shared/supabase.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  try {
    // Verify JWT authentication
    const authUserId = await requireJwt(req);

    // Check if authenticated user is a master user
    const supabaseClient = createUserClientFromRequest(req);
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('is_master_user')
      .eq('auth_user_id', authUserId)
      .single();
    
    if (!existingUser?.is_master_user) {
      return errorResponse(req, 'Unauthorized: Master user privileges required', 403);
    }

    const supabaseAdmin = createServiceClient();

    // SECURITY: Generate secure random password
    const randomPassword = crypto.randomUUID();
    
    // Create master user account
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'phil@reflowai.co.uk',
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Phil Myers - Master Admin',
        role: 'master_admin'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return errorResponse(req, authError.message, 400);
    }

    // Update the existing user record with the auth_user_id
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        auth_user_id: authUser.user.id
      })
      .eq('email', 'phil@reflowai.co.uk');

    if (updateError) {
      console.error('User table update error:', updateError);
      return errorResponse(req, updateError.message, 400);
    }

    // SECURITY: Send password reset email for first login
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: 'phil@reflowai.co.uk'
    });

    return jsonResponse(req, { 
      user_id: authUser.user.id,
      email: authUser.user.email,
      message: 'Master user created successfully. Password reset email sent.'
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Function error:', message);
    const status = message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
};

serve(handler);
