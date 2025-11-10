import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetryEmailRequest {
  emailLogId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is a practice manager
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, practice_id, is_practice_manager')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userData.is_practice_manager) {
      console.error('User is not a practice manager');
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only practice managers can retry emails' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const { emailLogId }: RetryEmailRequest = await req.json();

    if (!emailLogId) {
      return new Response(
        JSON.stringify({ error: 'Email log ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch the original email log
    const { data: emailLog, error: logError } = await supabaseClient
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .eq('practice_id', userData.practice_id)
      .single();

    if (logError || !emailLog) {
      console.error('Email log lookup error:', logError);
      return new Response(
        JSON.stringify({ error: 'Email log not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if email is eligible for retry (failed or bounced)
    if (!['failed', 'bounced'].includes(emailLog.status)) {
      return new Response(
        JSON.stringify({ error: 'Only failed or bounced emails can be retried' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Get email template based on email type
    let emailHtml = '';
    const metadata = emailLog.metadata || {};

    if (emailLog.email_type === 'policy_review') {
      emailHtml = `
        <h1>Policy Review Required</h1>
        <p>Dear ${emailLog.recipient_name || 'Team Member'},</p>
        <p>A policy document requires your review and acknowledgment.</p>
        <p><strong>Policy:</strong> ${metadata.policy_title || 'N/A'}</p>
        <p><strong>Due Date:</strong> ${metadata.review_due ? new Date(metadata.review_due).toLocaleDateString() : 'N/A'}</p>
        <p>Please log in to the system to review and acknowledge this policy.</p>
        <p>Best regards,<br>Your Practice Team</p>
      `;
    } else if (emailLog.email_type === 'policy_acknowledgment_reminder') {
      emailHtml = `
        <h1>Policy Acknowledgment Reminder</h1>
        <p>Dear ${emailLog.recipient_name || 'Team Member'},</p>
        <p>This is a reminder that you have pending policy acknowledgments.</p>
        <p><strong>Policy:</strong> ${metadata.policy_title || 'N/A'}</p>
        <p><strong>Due Date:</strong> ${metadata.review_due ? new Date(metadata.review_due).toLocaleDateString() : 'N/A'}</p>
        <p>Please log in to the system to complete your acknowledgment.</p>
        <p>Best regards,<br>Your Practice Team</p>
      `;
    } else if (emailLog.email_type === 'policy_escalation') {
      emailHtml = `
        <h1>Policy Acknowledgment Overdue</h1>
        <p>Dear ${emailLog.recipient_name || 'Manager'},</p>
        <p>The following staff member has overdue policy acknowledgments:</p>
        <p><strong>Staff Member:</strong> ${metadata.staff_name || 'N/A'}</p>
        <p><strong>Policy:</strong> ${metadata.policy_title || 'N/A'}</p>
        <p><strong>Days Overdue:</strong> ${metadata.days_overdue || 'N/A'}</p>
        <p>Please follow up with the staff member.</p>
        <p>Best regards,<br>Your Practice Team</p>
      `;
    } else {
      // Generic email template
      emailHtml = `
        <h1>${emailLog.subject}</h1>
        <p>Dear ${emailLog.recipient_name || 'Team Member'},</p>
        <p>This is a resent email from your practice management system.</p>
        <p>Best regards,<br>Your Practice Team</p>
      `;
    }

    // Resend the email
    console.log(`Retrying email to ${emailLog.recipient_email}`);
    const emailResponse = await resend.emails.send({
      from: 'GP Practice Hub <onboarding@resend.dev>',
      to: [emailLog.recipient_email],
      subject: `[RETRY] ${emailLog.subject}`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log('Email resent successfully:', emailResponse.data);

    // Create a new email log entry for the retry
    const { error: insertError } = await supabaseClient
      .from('email_logs')
      .insert({
        practice_id: userData.practice_id,
        resend_email_id: emailResponse.data?.id || null,
        recipient_email: emailLog.recipient_email,
        recipient_name: emailLog.recipient_name,
        email_type: emailLog.email_type,
        subject: `[RETRY] ${emailLog.subject}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          retry_of: emailLogId,
          retried_by: userData.id,
          original_status: emailLog.status,
        },
      });

    if (insertError) {
      console.error('Error logging retry:', insertError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email resent successfully',
        emailId: emailResponse.data?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in retry-email function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
