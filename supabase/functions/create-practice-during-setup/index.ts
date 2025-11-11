import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePracticeRequest {
  name: string;
  country: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-practice-during-setup] Request received');

    // Create Supabase client with service role for elevated privileges
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authenticated user from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[create-practice-during-setup] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error('[create-practice-during-setup] User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-practice-during-setup] User authenticated:', user.id);

    // Parse request body
    const body: CreatePracticeRequest = await req.json();
    const { name, country } = body;

    if (!name || !country) {
      console.error('[create-practice-during-setup] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name and country' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-practice-during-setup] Creating practice:', name);

    // Use service role to create practice (bypasses RLS)
    const { data: practice, error: practiceError } = await supabaseAdmin
      .from('practices')
      .insert({
        name,
        country,
      })
      .select()
      .single();

    if (practiceError) {
      console.error('[create-practice-during-setup] Failed to create practice:', practiceError);
      return new Response(
        JSON.stringify({ error: 'Failed to create practice', details: practiceError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-practice-during-setup] Practice created successfully:', practice.id);

    // Log the practice creation in audit trail
    const { error: auditError } = await supabaseAdmin
      .from('audit_trail')
      .insert({
        actor_id: user.id,
        practice_id: practice.id,
        entity_type: 'practices',
        entity_id: practice.id,
        action: 'CREATE',
        metadata: {
          practice_name: name,
          country,
          context: 'organization_setup',
        },
      });

    if (auditError) {
      console.error('[create-practice-during-setup] Failed to create audit log:', auditError);
      // Don't fail the request if audit logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        practice 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[create-practice-during-setup] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
