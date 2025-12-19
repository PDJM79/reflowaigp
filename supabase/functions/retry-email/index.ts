// supabase/functions/retry-email/index.ts
// JWT-protected - users with run_reports capability can retry failed emails

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { requireJwtAndPractice } from '../_shared/auth.ts';
import { createAnonClient } from '../_shared/supabase.ts';
import { requireCapability } from '../_shared/capabilities.ts';

interface RetryEmailRequest {
  emailLogId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Require authenticated user and get their practice
    const { authUserId, practiceId, appUserId } = await requireJwtAndPractice(req);
    const supabaseClient = createAnonClient(req);

    // Verify user has run_reports capability
    await requireCapability(
      supabaseClient,
      authUserId,
      'run_reports',
      'Forbidden: run_reports capability required to retry emails'
    );

    // Parse request body
    const { emailLogId }: RetryEmailRequest = await req.json();

    if (!emailLogId) {
      return new Response(
        JSON.stringify({ error: 'Email log ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the original email log
    const { data: emailLog, error: logError } = await supabaseClient
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .eq('practice_id', practiceId)
      .single();

    if (logError || !emailLog) {
      console.error('Email log lookup error:', logError);
      return new Response(
        JSON.stringify({ error: 'Email log not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is eligible for retry (failed or bounced)
    if (!['failed', 'bounced'].includes(emailLog.status)) {
      return new Response(
        JSON.stringify({ error: 'Only failed or bounced emails can be retried' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        practice_id: practiceId,
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
          retried_by: appUserId,
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in retry-email function:', error);
    const status = error.message?.includes('Forbidden') || error.message?.includes('Unauthorized') ? 403 : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
