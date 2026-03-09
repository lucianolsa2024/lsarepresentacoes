import { useMemo } from 'react';
import { Activity } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Store } from 'lucide-react';

interface ClientShareWidgetProps {
  activities: Activity[];
}

const getShareColor = (share: number) => {
  if (share >= 50) return 'bg-green-600 text-white hover:bg-green-600';
  if (share >= 20) return 'bg-yellow-500 text-white hover:bg-yellow-500';
  return 'bg-red-600 text-white hover:bg-red-600';
};

interface SharePoint {
  date: string;
  label: string;
  share: number;
  nossos: number;
  total: number;
}

export function ClientShareWidget({ activities }: ClientShareWidgetProps) {
  const shareHistory = useMemo<SharePoint[]>(() => {
    return activities
      .filter(a => a.type === 'checklist_loja' && a.description)
      .map(a => {
        try {
          const data = JSON.parse(a.description!);
          const nossos = data.qtdProdutosNossos || 0;
          const concorrentes = data.qtdProdutosConcorrentes || 0;
          const total = nossos + concorrentes;
          if (total === 0) return null;
          const date = data.dataVisita || a.due_date;
          return {
            date,
            label: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            share: Math.round((nossos / total) * 100),
            nossos,
            total,
          };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => a!.date.localeCompare(b!.date)) as SharePoint[];
  }, [activities]);

  if (shareHistory.length === 0) return null;

  const latest = shareHistory[shareHistory.length - 1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Store className="h-4 w-4" /> Share de Loja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current share */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Share atual:</span>
          <Badge className={getShareColor(latest.share)}>{latest.share}%</Badge>
          <span className="text-xs text-muted-foreground">
            ({latest.nossos}/{latest.total} produtos)
          </span>
        </div>

        {/* Evolution chart if more than 1 data point */}
        {shareHistory.length > 1 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shareHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Share']}
                />
                <Line type="monotone" dataKey="share" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History list */}
        <div className="space-y-1">
          {shareHistory.slice().reverse().slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{p.nossos}/{p.total}</span>
                <Badge className={`text-xs ${getShareColor(p.share)}`}>{p.share}%</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
