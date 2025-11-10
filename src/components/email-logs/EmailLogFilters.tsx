import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmailLogFiltersProps {
  search: string;
  status: string;
  emailType: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onEmailTypeChange: (value: string) => void;
}

export function EmailLogFilters({
  search,
  status,
  emailType,
  onSearchChange,
  onStatusChange,
  onEmailTypeChange,
}: EmailLogFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('email_logs.search_placeholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder={t('email_logs.filter_status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('email_logs.all_statuses')}</SelectItem>
          <SelectItem value="sent">{t('email_logs.status.sent')}</SelectItem>
          <SelectItem value="delivered">{t('email_logs.status.delivered')}</SelectItem>
          <SelectItem value="opened">{t('email_logs.status.opened')}</SelectItem>
          <SelectItem value="clicked">{t('email_logs.status.clicked')}</SelectItem>
          <SelectItem value="bounced">{t('email_logs.status.bounced')}</SelectItem>
          <SelectItem value="failed">{t('email_logs.status.failed')}</SelectItem>
          <SelectItem value="complained">{t('email_logs.status.complained')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={emailType} onValueChange={onEmailTypeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder={t('email_logs.filter_email_type')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('email_logs.all_types')}</SelectItem>
          <SelectItem value="policy_review">{t('email_logs.type.policy_review')}</SelectItem>
          <SelectItem value="policy_acknowledgment_reminder">{t('email_logs.type.policy_acknowledgment_reminder')}</SelectItem>
          <SelectItem value="policy_escalation">{t('email_logs.type.policy_escalation')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
