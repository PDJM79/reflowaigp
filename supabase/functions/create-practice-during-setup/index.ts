import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwt } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface CreatePracticeRequest {
  name: string;
  country: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  try {
    // Validate JWT - user won't have a practice yet during setup
    const { userId } = await requireJwt(req);

    console.log('[create-practice-during-setup] User authenticated:', userId);

    // Parse request body
    const body: CreatePracticeRequest = await req.json();
    const { name, country } = body;

    if (!name || !country) {
      console.error('[create-practice-during-setup] Missing required fields');
      return errorResponse(req, 'Missing required fields: name and country', 400);
    }

    console.log('[create-practice-during-setup] Creating practice:', name);

    const supabase = createServiceClient();

    // Create practice using service role (bypasses RLS)
    const { data: practice, error: practiceError } = await supabase
      .from('practices')
      .insert({
        name,
        country,
      })
      .select()
      .single();

    if (practiceError) {
      console.error('[create-practice-during-setup] Failed to create practice:', practiceError);
      return errorResponse(req, `Failed to create practice: ${practiceError.message}`, 500);
    }

    console.log('[create-practice-during-setup] Practice created successfully:', practice.id);

    // Log the practice creation in audit trail
    const { error: auditError } = await supabase
      .from('audit_trail')
      .insert({
        actor_id: userId,
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

    return jsonResponse(req, { 
      success: true, 
      practice 
    });

  } catch (error) {
    console.error('[create-practice-during-setup] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Missing') || message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
});
