import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Mail, Send, Loader2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmailReportsSettings() {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

  const handleTestReport = async () => {
    setSending(true);
    try {
      toast.info('Email report functionality is not yet connected to the backend');
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error('Failed to send test report');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('email_reports.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('email_reports.description')}</p>
      </div>

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
            <p className="text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>{t('email_reports.schedule_info_title')}</strong><br />
                {t('email_reports.schedule_info_weekly')}<br />
                {t('email_reports.schedule_info_monthly')}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{t('email_reports.recipients_info')}</span>
            </p>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-sm text-blue-900 dark:text-blue-100 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{t('email_reports.test_report_note')}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('email_reports.setup_title')}</CardTitle>
          <CardDescription>{t('email_reports.setup_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg text-center">
            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Email report scheduling will be available once the email service is configured.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}