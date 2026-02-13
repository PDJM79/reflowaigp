import { format, subDays } from 'date-fns';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  REQUEST_TYPES,
  type RequestFiltersState,
  type RequestStatus,
  type RequestType,
} from './types';

interface RequestFiltersProps {
  filters: RequestFiltersState;
  onFiltersChange: (filters: RequestFiltersState) => void;
}

const STATUS_OPTIONS: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'received', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'sent', label: 'Completed' },
];

export function RequestFilters({
  filters,
  onFiltersChange,
}: RequestFiltersProps) {
  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as RequestStatus | 'all',
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value as RequestType | 'all',
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };

  const handleDateFromChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateFrom: value,
    });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateTo: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      type: 'all',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by notes, requester, reference..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={filters.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Request Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {REQUEST_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Input
          type="date"
          placeholder="From"
          value={filters.dateFrom}
          onChange={(e) => handleDateFromChange(e.target.value)}
          className="w-[150px]"
        />

        {/* Date To */}
        <Input
          type="date"
          placeholder="To"
          value={filters.dateTo}
          onChange={(e) => handleDateToChange(e.target.value)}
          className="w-[150px]"
        />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status:{' '}
              {STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, status: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type:{' '}
              {REQUEST_TYPES.find((t) => t.value === filters.type)?.label}
              <button
                onClick={() => onFiltersChange({ ...filters, type: 'all' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              From: {filters.dateFrom}
              <button
                onClick={() => onFiltersChange({ ...filters, dateFrom: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              To: {filters.dateTo}
              <button
                onClick={() => onFiltersChange({ ...filters, dateTo: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <button
                onClick={() => onFiltersChange({ ...filters, search: '' })}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
