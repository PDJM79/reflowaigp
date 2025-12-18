// supabase/functions/resend-webhook-handler/index.ts
// Handles Resend email event webhooks with proper Svix signature verification

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { verifyResendSvix } from '../_shared/resendWebhook.ts';
import { createServiceClient } from '../_shared/supabase.ts';

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at?: string;
    bounce?: {
      bounceType: string;
      bounceSubType?: string;
    };
    complaint?: {
      complaintFeedbackType: string;
    };
  };
}

serve(async (req) => {
  // No CORS for webhooks - not called from browser
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify Svix signature - throws if invalid
    console.log('📬 Verifying Resend webhook signature...');
    const payloadText = await verifyResendSvix(req);
    console.log('✅ Webhook signature verified');

    const event: ResendWebhookEvent = JSON.parse(payloadText);
    console.log(`📧 Event type: ${event.type}, Email ID: ${event.data.email_id}`);

    const supabase = createServiceClient();
    const emailId = event.data.email_id;

    // Find the email log entry by resend_email_id
    const { data: existingLog, error: findError } = await supabase
      .from('email_logs')
      .select('id, status')
      .eq('resend_email_id', emailId)
      .single();

    if (findError || !existingLog) {
      console.log(`⚠️ No email log found for email_id: ${emailId}`);
      // Still return 200 to acknowledge receipt
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email log not found, but webhook acknowledged',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update email log based on event type
    const updateData: Record<string, unknown> = { 
      updated_at: new Date().toISOString() 
    };

    switch (event.type) {
      case 'email.sent':
        updateData.status = 'sent';
        break;

      case 'email.delivered':
        updateData.status = 'delivered';
        updateData.delivered_at = new Date().toISOString();
        console.log(`✅ Email delivered: ${emailId}`);
        break;

      case 'email.delivery_delayed':
        updateData.status = 'delayed';
        console.log(`⏱️ Email delivery delayed: ${emailId}`);
        break;

      case 'email.complained':
        updateData.status = 'complained';
        updateData.complained_at = new Date().toISOString();
        console.log(`⚠️ Email complaint received: ${emailId}`);
        break;

      case 'email.bounced':
        updateData.status = 'bounced';
        updateData.bounced_at = new Date().toISOString();
        updateData.bounce_type = event.data.bounce?.bounceType || 'unknown';
        updateData.bounce_reason = event.data.bounce?.bounceSubType || null;
        console.log(`❌ Email bounced: ${emailId} (${updateData.bounce_type})`);
        break;

      case 'email.opened':
        if (!['bounced', 'complained'].includes(existingLog.status)) {
          updateData.opened_at = new Date().toISOString();
          if (existingLog.status === 'delivered') {
            updateData.status = 'opened';
          }
        }
        console.log(`👁️ Email opened: ${emailId}`);
        break;

      case 'email.clicked':
        if (!['bounced', 'complained'].includes(existingLog.status)) {
          updateData.clicked_at = new Date().toISOString();
          if (['delivered', 'opened'].includes(existingLog.status)) {
            updateData.status = 'clicked';
          }
        }
        console.log(`🖱️ Email link clicked: ${emailId}`);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Event type ${event.type} acknowledged but not processed`,
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Update the email log (idempotent via email_id)
    const { error: updateError } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', existingLog.id);

    if (updateError) {
      console.error('❌ Error updating email log:', updateError);
      throw updateError;
    }

    console.log(`✓ Email log updated for ${emailId}: ${event.type}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        event_type: event.type,
        email_id: emailId,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('❌ resend-webhook-handler error:', e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      }),
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
