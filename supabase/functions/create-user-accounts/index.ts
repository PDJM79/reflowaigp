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

    const { email, name, role, practice_id, password }: CreateUserRequest = await req.json();

    // Create user with provided password or default
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || 'Password',
      email_confirm: true,
      user_metadata: {
        name,
        role,
        force_password_change: !password // Only force change if using default password
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
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email,
        name,
        role,
        practice_id,
        is_practice_manager: role === 'practice_manager'
      });

    if (userError) {
      console.error('User table error:', userError);
      // Clean up auth user if user table insert fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      user_id: authUser.user.id,
      email: authUser.user.email 
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