import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { CompanyRow, ReportFilters } from '@/hooks/useFinanceReports';

interface Props {
  filters: ReportFilters;
  setFilters: (f: ReportFilters) => void;
  companies: CompanyRow[];
  onExport?: () => void;
  exportLabel?: string;
}

const presets: { label: string; months: number }[] = [
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
];

const monthStartISO = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
const monthEndISO = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

export function ReportFiltersBar({ filters, setFilters, companies, onExport, exportLabel }: Props) {
  const applyPreset = (months: number) => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    setFilters({
      ...filters,
      start: monthStartISO(start),
      end: monthEndISO(now),
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Início</Label>
            <Input
              type="date"
              value={filters.start}
              onChange={(e) => setFilters({ ...filters, start: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fim</Label>
            <Input
              type="date"
              value={filters.end}
              onChange={(e) => setFilters({ ...filters, end: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Empresa</Label>
            <Select
              value={filters.companyId}
              onValueChange={(v) => setFilters({ ...filters, companyId: v as ReportFilters['companyId'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Consolidado (todas)</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Base</Label>
            <Select
              value={filters.basis}
              onValueChange={(v) => setFilters({ ...filters, basis: v as ReportFilters['basis'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competencia">Competência (vencimento)</SelectItem>
                <SelectItem value="caixa">Caixa (pagamento)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => applyPreset(p.months)}>
                {p.label}
              </Button>
            ))}
            {onExport && (
              <Button type="button" size="sm" onClick={onExport}>
                {exportLabel ?? 'Exportar'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
