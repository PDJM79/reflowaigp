import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  email: string;
  newPassword: string;
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

    // SECURITY: Only practice managers can reset passwords
    const { data: requesterUser } = await supabaseClient
      .from('users')
      .select('is_practice_manager')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!requesterUser?.is_practice_manager) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Practice manager privileges required' }),
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

    const { email, newPassword }: ResetPasswordRequest = await req.json();

    console.log(`Attempting to reset password for user: ${email}`);

    // Find the user by email in user_contact_details
    const { data: contactData, error: contactError } = await supabaseAdmin
      .from('user_contact_details')
      .select('user_id, users(auth_user_id)')
      .eq('email', email)
      .single();
    
    if (contactError || !contactData) {
      console.error('User not found:', contactError);
      return new Response(JSON.stringify({ error: `User with email ${email} not found` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authUserId = (contactData.users as any).auth_user_id;
    
    if (!authUserId) {
      console.error(`Auth user ID not found for email: ${email}`);
      return new Response(JSON.stringify({ error: `User account error` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reset the user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUserId,
      {
        password: newPassword
      }
    );

    if (updateError) {
      console.error('Error updating user password:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully reset password for user: ${email}`);

    return new Response(JSON.stringify({ 
      message: `Password successfully reset for ${email}`,
      user_id: updatedUser.user.id,
      email: updatedUser.user.email
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
