import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { DEMAND_STATUS_LABELS, DEMAND_TYPE_LABELS, PRIORITY_LABELS } from '@/types/ouvidoria';
import { useNavigate } from 'react-router-dom';
import { getDemands } from '@/lib/api';

const statusClass = (status: string) => {
  const map: Record<string, string> = {
    registrada: 'status-badge-registered',
    em_analise: 'status-badge-analysis',
    em_atendimento: 'status-badge-attending',
    respondida: 'status-badge-responded',
    concluida: 'status-badge-completed',
    cancelada: 'status-badge-cancelled',
  };
  return map[status] || '';
};

const priorityClass = (priority: string) => {
  const map: Record<string, string> = {
    baixa: 'text-priority-low',
    media: 'text-priority-medium',
    alta: 'text-priority-high',
    urgente: 'text-priority-urgent',
  };
  return map[priority] || '';
};

const deadlineClass = (days: number) => {
  if (days <= 0) return 'deadline-danger font-semibold';
  if (days <= 3) return 'deadline-warning font-medium';
  return 'deadline-ok';
};

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['demands'],
    queryFn: getDemands,
  });

  // Compute live KPIs from real data
  const totalDemands = demands.length;
  const emAndamento = demands.filter(d => ['em_analise', 'em_atendimento'].includes(d.status)).length;
  const concluidas = demands.filter(d => d.status === 'concluida').length;
  const prazoVencido = demands.filter(d => d.daysRemaining <= 0 && d.status !== 'concluida' && d.status !== 'cancelada').length;

  const kpis = [
    {
      title: 'Total de Demandas',
      value: String(totalDemands),
      icon: FileText,
      accent: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Em Andamento',
      value: String(emAndamento),
      icon: Clock,
      accent: 'text-status-analysis',
      bg: 'bg-status-analysis/10',
    },
    {
      title: 'Concluídas',
      value: String(concluidas),
      icon: CheckCircle2,
      accent: 'text-status-completed',
      bg: 'bg-status-completed/10',
    },
    {
      title: 'Prazo Vencido',
      value: String(prazoVencido),
      icon: AlertTriangle,
      accent: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  // Compute type breakdown
  const typeCounts: Record<string, number> = {};
  for (const d of demands) {
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
  }
  const typeBreakdown = Object.entries(DEMAND_TYPE_LABELS).map(([key, label]) => ({
    label,
    count: typeCounts[key] || 0,
    pct: totalDemands > 0 ? Math.round(((typeCounts[key] || 0) / totalDemands) * 100) : 0,
  }));

  // Compute organ breakdown
  const organCounts: Record<string, number> = {};
  for (const d of demands) {
    const name = d.organName || 'Outros';
    organCounts[name] = (organCounts[name] || 0) + 1;
  }
  const organBreakdown = Object.entries(organCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      pct: totalDemands > 0 ? Math.round((count / totalDemands) * 100) : 0,
    }));

  const typeColors = [
    'bg-destructive',
    'bg-status-attending',
    'bg-status-analysis',
    'bg-status-completed',
    'bg-primary',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral das demandas da Ouvidoria Municipal</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.title} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.accent}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Demands */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Demandas Recentes</CardTitle>
                <button
                  onClick={() => navigate('/demandas')}
                  className="text-sm text-accent hover:underline font-medium flex items-center gap-1"
                >
                  Ver todas <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Protocolo</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Órgão</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Prazo</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.slice(0, 5).map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => navigate(`/demandas/${d.id}`)}
                        className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 font-mono font-medium text-foreground">{d.protocol}</td>
                        <td className="px-5 py-3 text-muted-foreground">{DEMAND_TYPE_LABELS[d.type]}</td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className="text-xs font-medium">{d.organName}</Badge>
                        </td>
                        <td className={`px-5 py-3 text-xs ${deadlineClass(d.daysRemaining)}`}>
                          {d.daysRemaining <= 0 ? `${Math.abs(d.daysRemaining)}d atrasado` : `${d.daysRemaining}d restantes`}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(d.status)}`}>
                            {DEMAND_STATUS_LABELS[d.status]}
                          </span>
                        </td>
                        <td className={`px-5 py-3 text-xs font-medium ${priorityClass(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Por Tipo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeBreakdown.map((item, idx) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${typeColors[idx % typeColors.length]}`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Por Órgão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {organBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
