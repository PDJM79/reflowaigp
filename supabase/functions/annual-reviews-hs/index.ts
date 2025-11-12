import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Annual H&S Reviews CRON: Starting');

    const currentDate = new Date();
    const oneMonthFromNow = new Date(currentDate);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    // Get all active practices
    const { data: practices, error: practicesError } = await supabase
      .from('practices')
      .select('id, name')
      .eq('is_active', true);

    if (practicesError) {
      console.error('Error fetching practices:', practicesError);
      throw practicesError;
    }

    console.log(`Found ${practices?.length || 0} active practices`);

    const results = [];

    for (const practice of practices) {
      // Check Fire Risk Assessments due within 1 month
      const { data: fraData } = await supabase
        .from('fire_risk_assessments_v2')
        .select('id, assessment_date')
        .eq('practice_id', practice.id)
        .lte('next_review_due', oneMonthFromNow.toISOString())
        .is('completed_at', null);

      if (fraData && fraData.length > 0) {
        // Send notifications to estates leads and practice managers
        const { data: targetUsers } = await supabase
          .from('users')
          .select('id')
          .eq('practice_id', practice.id)
          .eq('is_active', true);

        if (targetUsers && targetUsers.length > 0) {
          const notifications = targetUsers.map((user: { id: string }) => ({
            practice_id: practice.id,
            user_id: user.id,
            notification_type: 'fire_safety_review_due',
            priority: 'high',
            title: 'Fire Risk Assessment Due',
            message: `Fire Risk Assessment review is due within the next month. Please schedule completion.`,
            action_url: '/fire-safety'
          }));

          await supabase.from('notifications').insert(notifications);
          results.push({ practice: practice.name, type: 'FRA', count: fraData.length, status: 'notified' });
        }
      }

      // Check COSHH assessments due for annual review
      const { data: coshhData } = await supabase
        .from('coshh_assessments')
        .select('id, substance_name')
        .eq('practice_id', practice.id)
        .lte('next_review_date', oneMonthFromNow.toISOString());

      if (coshhData && coshhData.length > 0) {
        const { data: targetUsers } = await supabase
          .from('users')
          .select('id')
          .eq('practice_id', practice.id)
          .eq('is_active', true);

        if (targetUsers && targetUsers.length > 0) {
          const notifications = targetUsers.map((user: { id: string }) => ({
            practice_id: practice.id,
            user_id: user.id,
            notification_type: 'coshh_review_due',
            priority: 'medium',
            title: 'COSHH Assessments Due for Review',
            message: `${coshhData.length} COSHH assessment(s) require annual review.`,
            action_url: '/health-safety/coshh'
          }));

          await supabase.from('notifications').insert(notifications);
          results.push({ practice: practice.name, type: 'COSHH', count: coshhData.length, status: 'notified' });
        }
      }
    }

    console.log('Annual H&S Reviews CRON: Completed', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Annual H&S Reviews CRON Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
