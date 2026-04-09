import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
} from 'lucide-react';
import { getAuditLogs } from '@/lib/api';
import type { AuditLog } from '@/lib/api';

const PAGE_SIZE = 50;

// ─── Human-readable labels ────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  login_failure: 'Tentativa de Login',
  logout: 'Logout',
  create_demand: 'Criar Demanda',
  update_demand: 'Editar Demanda',
  reopen_demand: 'Reabrir Demanda',
  forward_demand: 'Encaminhar Demanda',
  assign_demand: 'Atribuir Demanda',
  generate_response: 'Enviar Resposta',
  generate_ai_response: 'Gerar Resposta IA',
  create_user: 'Criar Usuário',
  update_user: 'Editar Usuário',
  update_user_password: 'Alterar Senha (Edição)',
  reset_password: 'Redefinir Senha',
  create_organ: 'Criar Órgão',
  update_organ: 'Editar Órgão',
  update_prompts: 'Atualizar Prompt',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  auth: 'Autenticação',
  demand: 'Demanda',
  user: 'Usuário',
  organ: 'Órgão',
  prompt: 'Prompt IA',
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  login_failure: 'bg-red-100 text-red-700',
  logout: 'bg-gray-100 text-gray-600',
  create_demand: 'bg-blue-100 text-blue-700',
  update_demand: 'bg-amber-100 text-amber-700',
  reopen_demand: 'bg-orange-100 text-orange-700',
  forward_demand: 'bg-purple-100 text-purple-700',
  assign_demand: 'bg-indigo-100 text-indigo-700',
  generate_response: 'bg-teal-100 text-teal-700',
  generate_ai_response: 'bg-cyan-100 text-cyan-700',
  create_user: 'bg-blue-100 text-blue-700',
  update_user: 'bg-amber-100 text-amber-700',
  update_user_password: 'bg-amber-100 text-amber-700',
  reset_password: 'bg-red-100 text-red-700',
  create_organ: 'bg-blue-100 text-blue-700',
  update_organ: 'bg-amber-100 text-amber-700',
  update_prompts: 'bg-purple-100 text-purple-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(raw: string): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function JsonBlock({ value }: { value: Record<string, any> | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const AuditLogs = () => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const queryParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entityType: entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => getAuditLogs(queryParams),
  });

  const logs = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Client-side search filter on user name, entity name, description
  const filtered = search
    ? logs.filter((l) => {
        const s = search.toLowerCase();
        return (
          (l.userName ?? '').toLowerCase().includes(s) ||
          (l.entityName ?? '').toLowerCase().includes(s) ||
          (l.description ?? '').toLowerCase().includes(s)
        );
      })
    : logs;

  const handleFilterChange = () => {
    setPage(0);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground text-sm">
            Registro completo de ações realizadas no sistema
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário, entidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={actionFilter}
              onValueChange={(v) => { setActionFilter(v); handleFilterChange(); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as ações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={entityTypeFilter}
              onValueChange={(v) => { setEntityTypeFilter(v); handleFilterChange(); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground whitespace-nowrap">De</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
                className="w-full"
                title="Data inicial"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
                className="w-full"
                title="Data final"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? 'Carregando...' : `${totalCount.toLocaleString('pt-BR')} registro(s) encontrado(s)`}
        </span>
        {totalPages > 1 && (
          <span>Página {page + 1} de {totalPages}</span>
        )}
      </div>

      {/* Table / Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum log encontrado para os filtros aplicados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2">
            {filtered.map((log) => (
              <Card key={log.id} className="border shadow-sm">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      <span
                        className={`inline-block shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                          ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      {log.entityType && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                        </Badge>
                      )}
                    </div>
                    {(log.oldValues || log.newValues) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        title="Ver detalhes"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {log.userName ?? 'Sistema'}
                      </span>
                      {log.userRole && (
                        <span className="text-[10px] text-muted-foreground capitalize ml-1">
                          · {log.userRole}
                        </span>
                      )}
                      {log.entityName && (
                        <p className="text-xs text-muted-foreground truncate">{log.entityName}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>

                  {log.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{log.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden sm:block border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Data/Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ação</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Entidade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Usuário</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.entityType && (
                          <div className="flex flex-col gap-0.5">
                            <Badge variant="outline" className="text-[10px] w-fit">
                              {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}
                            </Badge>
                            {log.entityName && (
                              <span className="text-xs text-muted-foreground font-medium">{log.entityName}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.userName ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-foreground">{log.userName}</span>
                            {log.userRole && (
                              <span className="text-[10px] text-muted-foreground capitalize">{log.userRole}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-sm truncate">
                        {log.description ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(log.oldValues || log.newValues) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Ver detalhes"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || isLoading}
          >
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[580px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Detalhes do Log
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatDateTime(selectedLog.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ação</p>
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[selectedLog.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Entidade</p>
                  <p className="font-medium">{selectedLog.entityName ?? '—'}</p>
                  {selectedLog.entityType && (
                    <p className="text-xs text-muted-foreground">{ENTITY_TYPE_LABELS[selectedLog.entityType] ?? selectedLog.entityType}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                  <p className="font-medium">{selectedLog.userName ?? 'Sistema'}</p>
                  {selectedLog.userRole && (
                    <p className="text-xs text-muted-foreground capitalize">{selectedLog.userRole}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID da Entidade</p>
                  <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.entityId ?? '—'}</p>
                </div>
              </div>
              {selectedLog.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                  <p>{selectedLog.description}</p>
                </div>
              )}
              {selectedLog.oldValues && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valores Anteriores</p>
                  <JsonBlock value={selectedLog.oldValues} />
                </div>
              )}
              {selectedLog.newValues && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Novos Valores</p>
                  <JsonBlock value={selectedLog.newValues} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
