import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('📬 Resend webhook received');

  try {
    // Verify webhook signature
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (webhookSecret) {
      const svixId = req.headers.get('svix-id');
      const svixTimestamp = req.headers.get('svix-timestamp');
      const svixSignature = req.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('❌ Missing required Svix headers');
        return new Response(
          JSON.stringify({ error: 'Missing webhook signature headers' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Note: Full Svix verification would require the Svix SDK
      // For now, we're just checking the headers exist
      console.log('✓ Webhook headers present');
    }

    const event: ResendWebhookEvent = await req.json();
    console.log(`📧 Event type: ${event.type}, Email ID: ${event.data.email_id}`);

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
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update email log based on event type
    let updateData: any = { updated_at: new Date().toISOString() };

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
        // Only update if not already in a terminal state
        if (!['bounced', 'complained'].includes(existingLog.status)) {
          updateData.opened_at = new Date().toISOString();
          if (existingLog.status === 'delivered') {
            updateData.status = 'opened';
          }
        }
        console.log(`👁️ Email opened: ${emailId}`);
        break;

      case 'email.clicked':
        // Only update if not already in a terminal state
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
        // Still acknowledge the webhook
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Event type ${event.type} acknowledged but not processed`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
    }

    // Update the email log
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
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in resend-webhook-handler:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
