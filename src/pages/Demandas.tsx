import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Plus, Paperclip, Eye, Loader2, Pencil, RotateCcw,
  TrendingUp, FileSearch, AlertCircle, Clock, CheckCircle2, X,
} from 'lucide-react';
import {
  DEMAND_STATUS_LABELS,
  DEMAND_TYPE_LABELS,
  PRIORITY_LABELS,
  DemandStatus,
  DemandType,
  DemandPriority,
} from '@/types/ouvidoria';
import type { Demand } from '@/types/ouvidoria';
import { getDemands, updateDemand, addDemandHistory, logAudit } from '@/lib/api';
import { calcScore, getScoreBand, SCORE_BAND_CLASS, scoreTooltip } from '@/lib/priorityScore';
import { DemandaModal } from '@/components/modals/NovaDemandaModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

function ensureTimezone(raw: string): string {
  if (raw && !raw.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    return raw + 'Z';
  }
  return raw;
}

function formatDateTime(raw: string): string {
  if (!raw) return '—';
  const d = new Date(ensureTimezone(raw));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

const DeadlineBadge = ({ days }: { days: number }) => {
  if (days <= 0) return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 whitespace-nowrap">
      {Math.abs(days)}d atrasado
    </span>
  );
  if (days <= 3) return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
      {days}d restantes
    </span>
  );
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 whitespace-nowrap">
      {days}d restantes
    </span>
  );
};

const Demandas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [sortByScore, setSortByScore] = useState(false);

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['demands'],
    queryFn: getDemands,
  });

  const filtered = demands.filter((d) => {
    if (profile?.role === 'atendente') {
      const isMyOrgan = d.organId === profile.primaryOrganId || (profile.organs && profile.organs.includes(d.organId));
      const isAssignedToMe = d.assignedTo === profile.id;
      if (!isMyOrgan || !isAssignedToMe) return false;
    }

    if (profile?.role === 'gestor_orgao' || profile?.role === 'ouvidor') {
      const isMyOrgan = d.organId === profile.primaryOrganId || (profile.organs && profile.organs.includes(d.organId));
      if (!isMyOrgan) return false;
    }

    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        d.protocol.includes(s) ||
        d.description.toLowerCase().includes(s) ||
        d.citizenName?.toLowerCase().includes(s) ||
        d.organName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const scoreMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calcScore>>();
    filtered.forEach((d) => map.set(d.id, calcScore(d)));
    return map;
  }, [filtered]);

  const displayList = useMemo(() =>
    sortByScore
      ? [...filtered].sort((a, b) => (scoreMap.get(b.id)?.total ?? 0) - (scoreMap.get(a.id)?.total ?? 0))
      : filtered,
    [filtered, sortByScore, scoreMap],
  );

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all' || search;

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPriorityFilter('all');
  };

  const openCreate = () => { setEditingDemand(null); setModalOpen(true); };
  const openEdit = (demand: Demand) => { setEditingDemand(demand); setModalOpen(true); };

  const handleReabrir = async (demand: Demand) => {
    if (!profile) {
      toast({ title: 'Erro: perfil não carregado.', variant: 'destructive' });
      return;
    }
    setReopeningId(demand.id);
    try {
      const oldStatus = demand.status;
      const newStatus: DemandStatus = 'em_analise';

      await updateDemand(demand.id, { status: newStatus });

      await addDemandHistory({
        demandId: demand.id,
        action: 'Reabertura de Demanda',
        description: `Demanda reaberta. Status anterior: ${DEMAND_STATUS_LABELS[oldStatus]}.`,
        userId: profile.id,
        fromStatus: oldStatus,
        toStatus: newStatus,
      });

      logAudit({
        action: 'reopen_demand',
        entityType: 'demand',
        entityId: demand.id,
        entityName: demand.protocol,
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        description: `Demanda ${demand.protocol} reaberta (status anterior: ${DEMAND_STATUS_LABELS[oldStatus]})`,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus },
      });

      queryClient.invalidateQueries({ queryKey: ['demands'] });
      queryClient.invalidateQueries({ queryKey: ['demand', demand.id] });
      queryClient.invalidateQueries({ queryKey: ['demand-history', demand.id] });
      toast({ title: 'Demanda reaberta com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao reabrir demanda.', description: err.message, variant: 'destructive' });
    } finally {
      setReopeningId(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
            {!isLoading && (
              <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {filtered.length}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">Gerenciamento de manifestações</p>
        </div>
        {profile?.role !== 'atendente' && (
          <Button className="gap-2 shrink-0 shadow-sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova Demanda
          </Button>
        )}
      </div>

      <DemandaModal open={modalOpen} onOpenChange={setModalOpen} demand={editingDemand} />

      {/* Quick stats */}
      {!isLoading && demands.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <FileSearch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{filtered.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total visível</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 leading-none">
                {filtered.filter(d => d.daysRemaining <= 0).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Atrasadas</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 leading-none">
                {filtered.filter(d => d.daysRemaining > 0 && d.daysRemaining <= 3).length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Próx. do prazo</p>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
                {filtered.filter(d => d.status === 'concluida').length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por protocolo, descrição ou cidadão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/40 border-border/60 focus-visible:bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[148px] bg-muted/40 border-border/60">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  {Object.entries(DEMAND_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] bg-muted/40 border-border/60">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Tipos</SelectItem>
                  {Object.entries(DEMAND_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px] bg-muted/40 border-border/60">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={sortByScore ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5 whitespace-nowrap h-9 border-border/60"
                onClick={() => setSortByScore((v) => !v)}
                title="Ordenar pela criticidade calculada automaticamente"
              >
                <TrendingUp className="w-4 h-4" />
                Score
              </Button>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Filtros:</span>
              {search && (
                <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                  "{search}"
                  <button onClick={() => setSearch('')} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                  {DEMAND_STATUS_LABELS[statusFilter as DemandStatus]}
                  <button onClick={() => setStatusFilter('all')} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                  {DEMAND_TYPE_LABELS[typeFilter as DemandType]}
                  <button onClick={() => setTypeFilter('all')} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              {priorityFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                  {PRIORITY_LABELS[priorityFilter as DemandPriority]}
                  <button onClick={() => setPriorityFilter('all')} className="ml-0.5 hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="ml-auto text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Limpar tudo
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border shadow-sm rounded-xl overflow-hidden">
        {!isLoading && (
          <CardHeader className="px-5 py-3 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <p className="text-xs text-muted-foreground font-medium">
              {displayList.length === 0
                ? 'Nenhuma demanda encontrada'
                : `${displayList.length} ${displayList.length === 1 ? 'demanda' : 'demandas'}${demands.length !== displayList.length ? ` de ${demands.length} no total` : ''}`
              }
            </p>
            {sortByScore && (
              <span className="text-xs text-primary flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                Ordenado por score
              </span>
            )}
          </CardHeader>
        )}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Carregando demandas...</p>
            </div>
          ) : displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <FileSearch className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Nenhuma demanda encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveFilters ? 'Tente ajustar ou limpar os filtros.' : 'Não há demandas cadastradas ainda.'}
                </p>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Protocolo</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Entrada</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Órgão</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Prazo</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Prioridade</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => setSortByScore((v) => !v)}
                        title="Clique para ordenar por score"
                      >
                        <TrendingUp className={`w-3.5 h-3.5 ${sortByScore ? 'text-primary' : ''}`} />
                        Score
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Responsável</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {displayList.map((d, idx) => (
                    <tr
                      key={d.id}
                      className={`hover:bg-muted/30 transition-colors group ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            className="font-mono font-semibold text-foreground hover:text-primary transition-colors text-sm"
                            onClick={() => navigate(`/demandas/${d.id}`)}
                          >
                            {d.protocol}
                          </button>
                          {Number(d.attachments) > 0 && (
                            <Paperclip className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{DEMAND_TYPE_LABELS[d.type]}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs hidden md:table-cell whitespace-nowrap">{formatDateTime(d.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="secondary" className="text-xs font-medium">{d.organName}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <DeadlineBadge days={d.daysRemaining} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(d.status)}`}>
                          {DEMAND_STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-xs font-semibold ${priorityClass(d.priority)}`}>
                        {PRIORITY_LABELS[d.priority]}
                      </td>
                      <td className="px-4 py-3.5">
                        {(() => {
                          const s = scoreMap.get(d.id)!;
                          const band = getScoreBand(s.total);
                          return (
                            <span
                              className={`inline-flex items-center font-semibold text-xs px-2.5 py-0.5 rounded-full ${SCORE_BAND_CLASS[band]}`}
                              title={scoreTooltip(s)}
                            >
                              {s.total}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell text-xs">
                        {d.assignedToName || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/demandas/${d.id}`)}
                            className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {profile?.role !== 'atendente' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(d)}
                              className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(d.status === 'respondida' || d.status === 'concluida' || d.status === 'cancelada') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReabrir(d)}
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Reabrir"
                              disabled={reopeningId === d.id}
                            >
                              {reopeningId === d.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Table footer */}
              {displayList.length > 5 && (
                <div className="px-5 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
                  {displayList.length} {displayList.length === 1 ? 'registro' : 'registros'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Demandas;
