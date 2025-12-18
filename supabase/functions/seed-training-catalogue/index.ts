import { handleOptions, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  const optRes = handleOptions(req);
  if (optRes) return optRes;

  try {
    // Validate JWT and get practice from user's membership
    const { practiceId } = await requireJwtAndPractice(req);

    console.log('[seed-training-catalogue] Seeding for practice:', practiceId);

    const supabase = createServiceClient();

    // Default NHS training types
    const trainingTypes = [
      { key: 'fire_safety', title: 'Fire Safety', level: null, recurrence_months: 12, audience_roles: ['all'], tags: {} },
      { key: 'health_safety_l1', title: 'Health & Safety Level 1', level: 'L1', recurrence_months: 36, audience_roles: ['all'], tags: {} },
      { key: 'manual_handling_l2', title: 'Manual Handling Level 2', level: 'L2', recurrence_months: 36, audience_roles: ['all'], tags: {} },
      { key: 'safeguarding_adults', title: 'Safeguarding Adults', level: 'L2/3', recurrence_months: 36, audience_roles: ['gp','nurse','hca','admin'], tags: { adult: true } },
      { key: 'safeguarding_children', title: 'Safeguarding Children', level: 'L2/3', recurrence_months: 36, audience_roles: ['gp','nurse','hca','admin'], tags: { child: true } },
      { key: 'information_governance', title: 'Information Governance & Records', level: null, recurrence_months: 12, audience_roles: ['all'], tags: {} },
      { key: 'immunisation_update', title: 'Immunisation Update', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'infection_prevention', title: 'Infection Prevention & Control', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca','estates','admin'], tags: {} },
      { key: 'resus_adult', title: 'Resuscitation – Adult', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'resus_child', title: 'Resuscitation – Child', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'anaphylaxis', title: 'Anaphylaxis', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'flu_update', title: 'Flu – Annual Update', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'covid_update', title: 'COVID – Annual Update', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'antt', title: 'ANTT – Aseptic Non-Touch Technique', level: null, recurrence_months: 12, audience_roles: ['gp','nurse','hca'], tags: {} },
      { key: 'mecc', title: 'MECC – Making Every Contact Count', level: null, recurrence_months: 36, audience_roles: ['gp','nurse','hca','admin'], tags: {} },
      { key: 'pgd', title: 'PGD – Patient Group Directions', level: null, recurrence_months: 24, audience_roles: ['gp','nurse'], tags: {} },
      { key: 'cervical_screening', title: 'Cervical Screening (cytology)', level: null, recurrence_months: 36, audience_roles: ['nurse'], tags: {} },
    ];

    // Check if any training types already exist for this practice
    const { data: existingTypes } = await supabase
      .from('training_types')
      .select('key')
      .eq('practice_id', practiceId);

    const existingKeys = new Set(existingTypes?.map(t => t.key) || []);
    const newTypes = trainingTypes.filter(t => !existingKeys.has(t.key));

    if (newTypes.length === 0) {
      return jsonResponse(req, { 
        message: 'Training catalogue already seeded for this practice',
        existing_count: existingTypes?.length || 0 
      });
    }

    // Insert new training types
    const typesToInsert = newTypes.map(type => ({
      practice_id: practiceId,
      key: type.key,
      title: type.title,
      level: type.level,
      recurrence_months: type.recurrence_months,
      audience_roles: type.audience_roles,
      tags: type.tags,
      certificate_required: true,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from('training_types')
      .insert(typesToInsert);

    if (insertError) {
      console.error('[seed-training-catalogue] Error inserting training types:', insertError);
      return errorResponse(req, insertError.message, 500);
    }

    console.log(`[seed-training-catalogue] Inserted ${newTypes.length} training types`);

    return jsonResponse(req, { 
      message: 'Training catalogue seeded successfully',
      inserted_count: newTypes.length,
      total_count: trainingTypes.length
    });

  } catch (error) {
    console.error('[seed-training-catalogue] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('Missing') || message.includes('Unauthorized') ? 401 : 500;
    return errorResponse(req, message, status);
  }
});
