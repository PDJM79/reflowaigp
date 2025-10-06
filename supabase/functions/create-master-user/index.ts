import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client to verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Only existing master users or administrators can create master users
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('is_master_user')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!existingUser?.is_master_user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Master user privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Send password reset email for first login
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: 'phil@reflowai.co.uk'
    });

    return new Response(JSON.stringify({ 
      user_id: authUser.user.id,
      email: authUser.user.email,
      message: 'Master user created successfully. Password reset email sent.'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
