import { useState, useMemo } from 'react';
import { Activity, ActivityType, ACTIVITY_TYPE_CONFIG, ACTIVITY_STATUS_CONFIG } from '@/types/activity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, TrendingUp, CheckCircle, Clock, Users } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityReportProps {
  activities: Activity[];
}

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#6366f1', '#6b7280'];

export function ActivityReport({ activities }: ActivityReportProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const activityDate = parseISO(a.due_date);
      return isWithinInterval(activityDate, {
        start: parseISO(startDate),
        end: parseISO(endDate),
      });
    });
  }, [activities, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filteredActivities.length;
    const completed = filteredActivities.filter(a => a.status === 'concluida').length;
    const cancelled = filteredActivities.filter(a => a.status === 'cancelada').length;
    const pending = filteredActivities.filter(a => a.status === 'pendente').length;
    const inProgress = filteredActivities.filter(a => a.status === 'em_andamento').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // By type
    const byType = Object.keys(ACTIVITY_TYPE_CONFIG).map(type => {
      const typeActivities = filteredActivities.filter(a => a.type === type);
      const typeCompleted = typeActivities.filter(a => a.status === 'concluida').length;
      return {
        type,
        label: ACTIVITY_TYPE_CONFIG[type as ActivityType].label,
        total: typeActivities.length,
        completed: typeCompleted,
        rate: typeActivities.length > 0 ? Math.round((typeCompleted / typeActivities.length) * 100) : 0,
      };
    }).filter(t => t.total > 0);

    // By client (top 10)
    const clientCounts: Record<string, { name: string; count: number }> = {};
    filteredActivities.forEach(a => {
      if (a.client) {
        if (!clientCounts[a.client.id]) {
          clientCounts[a.client.id] = { name: a.client.company, count: 0 };
        }
        clientCounts[a.client.id].count++;
      }
    });
    const byClient = Object.values(clientCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total,
      completed,
      cancelled,
      pending,
      inProgress,
      completionRate,
      byType,
      byClient,
    };
  }, [filteredActivities]);

  const chartData = stats.byType.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.completionRate}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              <Progress value={stats.completionRate} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por Tipo de Atividade</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" />
                  <Bar dataKey="completed" name="Concluídas" fill="hsl(142, 76%, 36%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado para exibir
              </p>
            )}
          </CardContent>
        </Card>

        {/* Type Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado para exibir
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Client */}
      {stats.byClient.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 10 Clientes por Atividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byClient.map((client, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{index + 1}.</span>
                  <span className="flex-1 text-sm">{client.name}</span>
                  <span className="text-sm font-medium">{client.count} atividades</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Tipo</th>
                  <th className="text-center py-2">Total</th>
                  <th className="text-center py-2">Concluídas</th>
                  <th className="text-center py-2">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {stats.byType.map((item) => (
                  <tr key={item.type} className="border-b">
                    <td className="py-2">{item.label}</td>
                    <td className="text-center py-2">{item.total}</td>
                    <td className="text-center py-2">{item.completed}</td>
                    <td className="text-center py-2">
                      <span className={item.rate >= 80 ? 'text-green-600' : item.rate >= 50 ? 'text-orange-600' : 'text-red-600'}>
                        {item.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
