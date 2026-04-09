import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BellRing,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Filter,
  X,
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
  if (days < 0) return 'deadline-danger font-semibold';
  if (days <= 3) return 'deadline-warning font-medium';
  return 'deadline-ok';
};

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === 'atendente') {
      navigate('/demandas', { replace: true });
    }
  }, [profile, navigate]);

  const { data: rawDemands = [], isLoading } = useQuery({
    queryKey: ['demands'],
    queryFn: getDemands,
  });

  const [periodFilter, setPeriodFilter] = useState('todos');
  const [organFilter, setOrganFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const demands = useMemo(() => {
    return rawDemands.filter((d) => {
      // Role filter
      if (profile?.role === 'gestor_orgao' || profile?.role === 'ouvidor') {
        const isMyOrgan = d.organId === profile.primaryOrganId || (profile.organs && profile.organs.includes(d.organId));
        if (!isMyOrgan) return false;
      }
      
      // Additional Filters
      if (organFilter !== 'todos' && d.organId !== organFilter) return false;
      if (categoryFilter !== 'todos' && d.type !== categoryFilter) return false;
      if (statusFilter !== 'todos' && d.status !== statusFilter) return false;

      if (periodFilter !== 'todos') {
        const demandDate = new Date(d.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - demandDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (periodFilter === '7d' && diffDays > 7) return false;
        if (periodFilter === '30d' && diffDays > 30) return false;
        if (periodFilter === 'mes') {
          if (demandDate.getMonth() !== now.getMonth() || demandDate.getFullYear() !== now.getFullYear()) return false;
        }
        if (periodFilter === 'ano') {
          if (demandDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      return true;
    });
  }, [rawDemands, profile, periodFilter, organFilter, categoryFilter, statusFilter]);

  const uniqueOrgans = useMemo(() => {
    const map = new Map<string, string>();
    rawDemands.forEach(d => {
      if (d.organId && d.organName) {
        map.set(d.organId, d.organName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawDemands]);

  // Compute live KPIs from real data
  const totalDemands = demands.length;
  const emAndamento = demands.filter(d => ['em_analise', 'em_atendimento'].includes(d.status)).length;
  const concluidas = demands.filter(d => d.status === 'concluida').length;
  const prazoVencido = demands.filter(d => d.daysRemaining < 0 && d.status !== 'concluida' && d.status !== 'cancelada').length;
  const proximasVencimento = demands.filter(d => d.daysRemaining >= 0 && d.daysRemaining <= 3 && d.status !== 'concluida' && d.status !== 'cancelada').length;

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
      title: 'Vence em Breve',
      value: String(proximasVencimento),
      icon: BellRing,
      accent: 'text-yellow-600 dark:text-yellow-500',
      bg: 'bg-yellow-600/10 dark:bg-yellow-500/10',
    },
    {
      title: 'Prazo Vencido',
      value: String(prazoVencido),
      icon: AlertTriangle,
      accent: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: 'Concluídas',
      value: String(concluidas),
      icon: CheckCircle2,
      accent: 'text-status-completed',
      bg: 'bg-status-completed/10',
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
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral das demandas da Ouvidoria</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
            </SelectContent>
          </Select>

          <Select value={organFilter} onValueChange={setOrganFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Órgão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os órgãos</SelectItem>
              {uniqueOrgans.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {Object.entries(DEMAND_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(DEMAND_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(periodFilter !== 'todos' || organFilter !== 'todos' || categoryFilter !== 'todos' || statusFilter !== 'todos') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setPeriodFilter('todos');
                setOrganFilter('todos');
                setCategoryFilter('todos');
                setStatusFilter('todos');
              }}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                          <div className="flex items-center gap-1.5">
                            {d.daysRemaining < 0 && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            {d.daysRemaining >= 0 && d.daysRemaining <= 3 && <BellRing className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />}
                            {d.daysRemaining > 3 && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />}
                            <span>
                              {d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)}d atrasado` : d.daysRemaining === 0 ? 'Vence hoje' : `${d.daysRemaining}d restantes`}
                            </span>
                          </div>
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
