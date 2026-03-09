import { ActivityType, ActivityPriority, ActivityStatus, ACTIVITY_TYPE_CONFIG, ACTIVITY_PRIORITY_CONFIG, ACTIVITY_STATUS_CONFIG } from '@/types/activity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';

interface ActivityFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: ActivityType | 'all';
  onTypeFilterChange: (value: ActivityType | 'all') => void;
  priorityFilter: ActivityPriority | 'all';
  onPriorityFilterChange: (value: ActivityPriority | 'all') => void;
  statusFilter: ActivityStatus | 'all';
  onStatusFilterChange: (value: ActivityStatus | 'all') => void;
  onClearFilters: () => void;
  repFilter?: string;
  onRepFilterChange?: (value: string) => void;
  representatives?: { name: string; email: string }[];
  showRepFilter?: boolean;
}

export function ActivityFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  repFilter = 'all',
  onRepFilterChange,
  representatives = [],
  showRepFilter = false,
}: ActivityFiltersProps) {
  const hasActiveFilters = 
    search || 
    typeFilter !== 'all' || 
    priorityFilter !== 'all' || 
    statusFilter !== 'all' ||
    repFilter !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar atividades..."
          className="pl-9"
        />
      </div>

      {/* Type Filter */}
      <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as ActivityType | 'all')}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select value={priorityFilter} onValueChange={(v) => onPriorityFilterChange(v as ActivityPriority | 'all')}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(ACTIVITY_PRIORITY_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as ActivityStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {Object.entries(ACTIVITY_STATUS_CONFIG).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Representative Filter */}
      {showRepFilter && onRepFilterChange && (
        <Select value={repFilter} onValueChange={onRepFilterChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Representante" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Representantes</SelectItem>
            {representatives.map(rep => (
              <SelectItem key={rep.email} value={rep.email}>{rep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
