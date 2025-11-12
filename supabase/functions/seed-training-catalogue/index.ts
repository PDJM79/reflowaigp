import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { practiceId } = await req.json();
    
    if (!practiceId) {
      return new Response(
        JSON.stringify({ error: 'practiceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      return new Response(
        JSON.stringify({ 
          message: 'Training catalogue already seeded for this practice',
          existing_count: existingTypes?.length || 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      console.error('Error inserting training types:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Training catalogue seeded successfully',
        inserted_count: newTypes.length,
        total_count: trainingTypes.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seed-training-catalogue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
