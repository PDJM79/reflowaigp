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
    console.log('Starting create-missing-accounts function');
    
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

    const { practice_id } = await req.json();
    console.log('Practice ID:', practice_id);

    // Get all role assignments for this practice that don't have user accounts yet
    const { data: roleAssignments, error: roleError } = await supabaseAdmin
      .from('role_assignments')
      .select('*')
      .eq('practice_id', practice_id)
      .is('user_id', null);

    if (roleError) {
      console.error('Error fetching role assignments:', roleError);
      throw roleError;
    }

    console.log('Found role assignments without accounts:', roleAssignments);

    const results = [];
    
    for (const assignment of roleAssignments || []) {
      try {
        console.log(`Creating account for ${assignment.assigned_email}`);
        
        // Create user with default password
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
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
          console.error(`Auth error for ${assignment.assigned_email}:`, authError);
          results.push({
            email: assignment.assigned_email,
            success: false,
            error: authError.message
          });
          continue;
        }

        // Create user record in users table
        const { error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: authUser.user.id,
            email: assignment.assigned_email,
            name: assignment.assigned_name,
            role: assignment.role,
            practice_id: assignment.practice_id,
            is_practice_manager: assignment.role === 'practice_manager'
          });

        if (userError) {
          console.error(`User table error for ${assignment.assigned_email}:`, userError);
          // Clean up auth user if user table insert fails
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          results.push({
            email: assignment.assigned_email,
            success: false,
            error: userError.message
          });
          continue;
        }

        // Update the role assignment with the user_id
        const { error: updateError } = await supabaseAdmin
          .from('role_assignments')
          .update({ user_id: authUser.user.id })
          .eq('id', assignment.id);

        if (updateError) {
          console.error(`Error updating role assignment for ${assignment.assigned_email}:`, updateError);
        }

        results.push({
          email: assignment.assigned_email,
          name: assignment.assigned_name,
          role: assignment.role,
          success: true,
          user_id: authUser.user.id
        });

        console.log(`Successfully created account for ${assignment.assigned_email}`);
        
      } catch (error: any) {
        console.error(`Error creating account for ${assignment.assigned_email}:`, error);
        results.push({
          email: assignment.assigned_email,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${results.length} role assignments`,
      results
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