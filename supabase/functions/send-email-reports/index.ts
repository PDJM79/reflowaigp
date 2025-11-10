import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { EmailReportTemplate } from './_templates/email-report.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  periodType?: 'weekly' | 'monthly';
  practiceId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting email reports generation...');

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Parse request (optional - can be triggered by cron without body)
    let periodType: 'weekly' | 'monthly' = 'weekly';
    let targetPracticeId: string | null = null;

    if (req.body) {
      try {
        const body: ReportRequest = await req.json();
        periodType = body.periodType || 'weekly';
        targetPracticeId = body.practiceId || null;
      } catch {
        // Body is optional, use defaults
      }
    }

    console.log(`Generating ${periodType} reports...`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (periodType === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get all practices (or specific practice if provided)
    let practicesQuery = supabaseAdmin.from('practices').select('id, name');
    
    if (targetPracticeId) {
      practicesQuery = practicesQuery.eq('id', targetPracticeId);
    }

    const { data: practices, error: practicesError } = await practicesQuery;

    if (practicesError) {
      console.error('Error fetching practices:', practicesError);
      throw practicesError;
    }

    if (!practices || practices.length === 0) {
      console.log('No practices found');
      return new Response(
        JSON.stringify({ message: 'No practices found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${practices.length} practice(s)...`);

    const results = [];

    for (const practice of practices) {
      try {
        console.log(`Processing practice: ${practice.name} (${practice.id})`);

        // Get practice managers for this practice
        const { data: managers, error: managersError } = await supabaseAdmin
          .from('users')
          .select('email, name')
          .eq('practice_id', practice.id)
          .eq('is_practice_manager', true)
          .eq('is_active', true);

        if (managersError || !managers || managers.length === 0) {
          console.log(`No practice managers found for ${practice.name}`);
          continue;
        }

        console.log(`Found ${managers.length} practice manager(s) for ${practice.name}`);

        // Fetch email logs for the period
        const { data: logs, error: logsError } = await supabaseAdmin
          .from('email_logs')
          .select('*')
          .eq('practice_id', practice.id)
          .gte('sent_at', startDate.toISOString())
          .lte('sent_at', endDate.toISOString());

        if (logsError) {
          console.error(`Error fetching logs for ${practice.name}:`, logsError);
          continue;
        }

        const emailLogs = logs || [];
        console.log(`Found ${emailLogs.length} email logs for ${practice.name}`);

        // Calculate statistics
        const totalSent = emailLogs.length;
        const delivered = emailLogs.filter(log => log.delivered_at).length;
        const bounced = emailLogs.filter(log => log.bounced_at).length;
        const opened = emailLogs.filter(log => log.opened_at).length;
        const clicked = emailLogs.filter(log => log.clicked_at).length;
        const failed = emailLogs.filter(log => log.status === 'failed').length;

        const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
        const bounceRate = totalSent > 0 ? Math.round((bounced / totalSent) * 100) : 0;
        const openRate = totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0;
        const clickRate = totalSent > 0 ? Math.round((clicked / totalSent) * 100) : 0;

        // Email type breakdown
        const typeMap = new Map<string, { count: number; opened: number }>();
        emailLogs.forEach(log => {
          const current = typeMap.get(log.email_type) || { count: 0, opened: 0 };
          current.count++;
          if (log.opened_at) current.opened++;
          typeMap.set(log.email_type, current);
        });

        const emailTypeBreakdown = Array.from(typeMap.entries()).map(([type, stats]) => ({
          type: type.replace(/_/g, ' '),
          count: stats.count,
          openRate: stats.count > 0 ? Math.round((stats.opened / stats.count) * 100) : 0,
        }));

        // Render email template
        const html = await renderAsync(
          React.createElement(EmailReportTemplate, {
            practiceName: practice.name,
            periodType,
            startDate: startDate.toLocaleDateString('en-GB'),
            endDate: endDate.toLocaleDateString('en-GB'),
            totalSent,
            deliveryRate,
            bounceRate,
            openRate,
            clickRate,
            failedCount: failed,
            emailTypeBreakdown,
          })
        );

        // Send email to all practice managers
        for (const manager of managers) {
          console.log(`Sending report to ${manager.email}...`);
          
          const emailResult = await resend.emails.send({
            from: 'GP Practice Hub <onboarding@resend.dev>',
            to: [manager.email],
            subject: `${periodType === 'weekly' ? 'Weekly' : 'Monthly'} Email Delivery Report - ${practice.name}`,
            html,
          });

          if (emailResult.error) {
            console.error(`Failed to send email to ${manager.email}:`, emailResult.error);
            results.push({
              practice: practice.name,
              manager: manager.email,
              success: false,
              error: emailResult.error.message,
            });
          } else {
            console.log(`Successfully sent report to ${manager.email}`);
            results.push({
              practice: practice.name,
              manager: manager.email,
              success: true,
              emailId: emailResult.data?.id,
            });

            // Log the report email
            await supabaseAdmin.from('email_logs').insert({
              practice_id: practice.id,
              resend_email_id: emailResult.data?.id || null,
              recipient_email: manager.email,
              recipient_name: manager.name,
              email_type: `${periodType}_report`,
              subject: `${periodType === 'weekly' ? 'Weekly' : 'Monthly'} Email Delivery Report - ${practice.name}`,
              status: 'sent',
              sent_at: new Date().toISOString(),
              metadata: {
                report_type: periodType,
                period_start: startDate.toISOString(),
                period_end: endDate.toISOString(),
                total_sent: totalSent,
                delivery_rate: deliveryRate,
              },
            });
          }
        }
      } catch (practiceError) {
        console.error(`Error processing practice ${practice.name}:`, practiceError);
        results.push({
          practice: practice.name,
          success: false,
          error: practiceError instanceof Error ? practiceError.message : 'Unknown error',
        });
      }
    }

    console.log('Email reports generation completed');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${practices.length} practice(s)`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-email-reports function:', error);
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
