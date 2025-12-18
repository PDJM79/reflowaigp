// supabase/functions/training-expiry-scan/index.ts
// CRON job: Scans for expiring training records and sends notifications
// Requires X-Job-Token header for authentication (verify_jwt=false)

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { requireCronSecret } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';

serve(async (req) => {
  // No CORS for CRON jobs - not called from browser
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Require CRON secret
    requireCronSecret(req);

    const supabase = createServiceClient();
    console.log('📚 Training Expiry Scan CRON: Starting daily scan');

    const currentDate = new Date();
    const thirtyDaysFromNow = new Date(currentDate);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const ninetyDaysFromNow = new Date(currentDate);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    // Get all training records expiring within 90 days
    const { data: expiringRecords, error: recordsError } = await supabase
      .from('training_records')
      .select(`
        *,
        employee:employees(id, name, practice_id),
        training_type:training_types(title, is_mandatory)
      `)
      .lte('expiry_date', ninetyDaysFromNow.toISOString())
      .or('reminder_sent_at.is.null,reminder_sent_at.lt.' + thirtyDaysFromNow.toISOString());

    if (recordsError) {
      console.error('Error fetching expiring records:', recordsError);
      throw recordsError;
    }

    console.log(`Found ${expiringRecords?.length || 0} expiring training records`);

    const results = [];

    for (const record of expiringRecords || []) {
      if (!record.employee || !record.training_type) continue;
      
      const expiryDate = new Date(record.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let priority: 'urgent' | 'high' | 'medium' = 'medium';
      let message = '';

      if (daysUntilExpiry <= 30) {
        priority = 'urgent';
        message = `Training certificate "${record.training_type.title}" expires in ${daysUntilExpiry} days`;
      } else if (daysUntilExpiry <= 60) {
        priority = 'high';
        message = `Training certificate "${record.training_type.title}" expires in ${daysUntilExpiry} days`;
      } else {
        message = `Training certificate "${record.training_type.title}" expires in ${daysUntilExpiry} days`;
      }

      // Get practice managers for this practice
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .eq('practice_id', record.employee.practice_id)
        .eq('is_active', true);

      if (managers && managers.length > 0) {
        // Send notification to managers
        const notifications = managers.map((manager: { id: string }) => ({
          practice_id: record.employee.practice_id,
          user_id: manager.id,
          notification_type: 'training_expiry_warning',
          priority,
          title: 'Training Certificate Expiring',
          message: `${record.employee.name}: ${message}`,
          action_url: '/hr'
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Update reminder_sent_at
      await supabase
        .from('training_records')
        .update({ reminder_sent_at: currentDate.toISOString() })
        .eq('id', record.id);

      results.push({
        employee: record.employee.name,
        training: record.training_type.title,
        days_until_expiry: daysUntilExpiry,
        priority,
        status: 'notified'
      });
    }

    console.log('✅ Training Expiry Scan CRON: Completed', results);

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Training Expiry Scan CRON Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 401 }
    );
  }
});
