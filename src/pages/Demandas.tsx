import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Plus, Filter, Paperclip, Eye, Loader2 } from 'lucide-react';
import {
  DEMAND_STATUS_LABELS,
  DEMAND_TYPE_LABELS,
  PRIORITY_LABELS,
  DemandStatus,
  DemandType,
  DemandPriority,
} from '@/types/ouvidoria';
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

const Demandas = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['demands'],
    queryFn: getDemands,
  });

  const filtered = demands.filter((d) => {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de manifestações</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Demanda
        </Button>
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por protocolo, descrição ou cidadão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
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
              <SelectTrigger className="w-full md:w-40">
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
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Protocolo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Entrada</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Órgão</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Prazo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Prioridade</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Responsável</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {d.protocol}
                            {d.attachments && (
                              <Paperclip className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{DEMAND_TYPE_LABELS[d.type]}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{d.createdAt}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">{d.organName}</Badge>
                        </td>
                        <td className={`px-4 py-3 text-xs ${deadlineClass(d.daysRemaining)}`}>
                          {d.daysRemaining <= 0 ? `${Math.abs(d.daysRemaining)}d atrasado` : `${d.daysRemaining}d`}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(d.status)}`}>
                            {DEMAND_STATUS_LABELS[d.status]}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs font-medium ${priorityClass(d.priority)}`}>
                          {PRIORITY_LABELS[d.priority]}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                          {d.assignedToName || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/demandas/${d.id}`)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma demanda encontrada com os filtros selecionados.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Demandas;
