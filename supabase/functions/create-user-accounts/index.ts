import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  name: string;
  role: string;
  practice_id: string;
  password?: string;
}

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

    const { email, name, role, practice_id, password }: CreateUserRequest = await req.json();

    // SECURITY: Verify user is practice manager for this practice
    const { data: requesterUser } = await supabaseClient
      .from('users')
      .select('is_practice_manager, practice_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!requesterUser?.is_practice_manager || requesterUser.practice_id !== practice_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Practice manager privileges required for this practice' }),
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
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user record in users table
    const { data: createdUser, error: userTableError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        name,
        practice_id,
        is_practice_manager: role === 'practice_manager'
      })
      .select('id')
      .single();

    if (userTableError) {
      console.error('User table error:', userTableError);
      // Clean up auth user if user table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      return new Response(JSON.stringify({ error: userTableError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      
      return new Response(JSON.stringify({ error: 'Failed to create user contact details' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return credentials so practice manager can send via their email client
    return new Response(JSON.stringify({ 
      user_id: createdUser.id,
      auth_user_id: authUser.user.id,
      email: authUser.user.email,
      temporary_password: securePassword,
      message: 'User created successfully. Use the email button to send login details.'
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
