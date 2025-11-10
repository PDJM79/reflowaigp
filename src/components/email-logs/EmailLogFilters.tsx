import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EmailLogFiltersProps {
  search: string;
  status: string;
  emailType: string;
  dateRange?: { start: Date; end: Date };
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onEmailTypeChange: (value: string) => void;
  onDateRangeChange: (range: { start: Date; end: Date } | undefined) => void;
}

export function EmailLogFilters({
  search,
  status,
  emailType,
  dateRange,
  onSearchChange,
  onStatusChange,
  onEmailTypeChange,
  onDateRangeChange,
}: EmailLogFiltersProps) {
  const { t } = useTranslation();
  const [date, setDate] = useState<Date | undefined>(dateRange?.start);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onDateRangeChange(undefined);
      setDate(undefined);
      return;
    }

    // Create range: start of selected day to end of selected day
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    setDate(selectedDate);
    onDateRangeChange({ start, end });
  };

  const clearDateRange = () => {
    setDate(undefined);
    onDateRangeChange(undefined);
  };

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

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full sm:w-[240px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>{t('email_logs.filter_date')}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {dateRange && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearDateRange}
          className="shrink-0"
          title={t('email_logs.clear_date')}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
