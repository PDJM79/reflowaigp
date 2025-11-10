import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Mail, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmailReportsSettings() {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

  const handleTestReport = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-reports', {
        body: { 
          periodType: reportType,
        },
      });

      if (error) throw error;

      toast.success(`Test ${reportType} report sent successfully!`);
      console.log('Report sent:', data);
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error('Failed to send test report');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('email_reports.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('email_reports.description')}</p>
      </div>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('email_reports.schedule_title')}
          </CardTitle>
          <CardDescription>{t('email_reports.schedule_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="weekly-reports">{t('email_reports.weekly_reports')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('email_reports.weekly_reports_desc')}
                </p>
              </div>
              <Switch
                id="weekly-reports"
                defaultChecked={true}
                disabled
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="monthly-reports">{t('email_reports.monthly_reports')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('email_reports.monthly_reports_desc')}
                </p>
              </div>
              <Switch
                id="monthly-reports"
                defaultChecked={true}
                disabled
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              📅 <strong>{t('email_reports.schedule_info_title')}</strong><br />
              {t('email_reports.schedule_info_weekly')}<br />
              {t('email_reports.schedule_info_monthly')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('email_reports.recipients_title')}
          </CardTitle>
          <CardDescription>{t('email_reports.recipients_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              ℹ️ {t('email_reports.recipients_info')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('email_reports.test_report_title')}
          </CardTitle>
          <CardDescription>{t('email_reports.test_report_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t('email_reports.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('email_reports.monthly')}</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleTestReport} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('email_reports.sending')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('email_reports.send_test')}
                </>
              )}
            </Button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 {t('email_reports.test_report_note')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('email_reports.setup_title')}</CardTitle>
          <CardDescription>{t('email_reports.setup_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">{t('email_reports.setup_step_1_title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('email_reports.setup_step_1_desc')}
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">{t('email_reports.setup_step_2_title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('email_reports.setup_step_2_desc')}
              </p>
              <code className="block p-2 bg-background rounded text-xs font-mono whitespace-pre-wrap">
                {`-- Weekly reports (every Monday at 9 AM)
SELECT cron.schedule(
  'weekly-email-reports',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url:='https://eeqfqklcdstbziedsnxc.supabase.co/functions/v1/send-email-reports',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"periodType": "weekly"}'::jsonb
  ) as request_id;
  $$
);

-- Monthly reports (first day of month at 9 AM)
SELECT cron.schedule(
  'monthly-email-reports',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url:='https://eeqfqklcdstbziedsnxc.supabase.co/functions/v1/send-email-reports',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"periodType": "monthly"}'::jsonb
  ) as request_id;
  $$
);`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
