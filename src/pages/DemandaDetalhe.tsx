import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Clock,
  Paperclip,
  Send,
  Forward,
  UserPlus,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  DEMAND_STATUS_LABELS,
  DEMAND_TYPE_LABELS,
  PRIORITY_LABELS,
  CHANNEL_LABELS,
} from '@/types/ouvidoria';
import { getDemandById, getDemandHistory } from '@/lib/api';

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
    baixa: 'bg-priority-low/10 text-priority-low',
    media: 'bg-priority-medium/10 text-priority-medium',
    alta: 'bg-priority-high/10 text-priority-high',
    urgente: 'bg-priority-urgent/10 text-priority-urgent',
  };
  return map[priority] || '';
};

const deadlineClass = (days: number) => {
  if (days <= 0) return 'deadline-danger';
  if (days <= 3) return 'deadline-warning';
  return 'deadline-ok';
};

const DemandaDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: demand, isLoading: loadingDemand } = useQuery({
    queryKey: ['demand', id],
    queryFn: () => getDemandById(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['demand-history', id],
    queryFn: () => getDemandHistory(id!),
    enabled: !!id,
  });

  if (loadingDemand) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Demanda não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/demandas')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/demandas')} className="self-start gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground font-mono">#{demand.protocol}</h1>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(demand.status)}`}>
              {DEMAND_STATUS_LABELS[demand.status]}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass(demand.priority)}`}>
              {PRIORITY_LABELS[demand.priority]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {DEMAND_TYPE_LABELS[demand.type]} • {CHANNEL_LABELS[demand.channel]} • {demand.organName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <Forward className="w-4 h-4" /> Encaminhar
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <UserPlus className="w-4 h-4" /> Atribuir
          </Button>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Criada em</p>
            <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              {demand.createdAt}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prazo</p>
            <p className={`text-sm font-medium mt-0.5 flex items-center gap-1 ${deadlineClass(demand.daysRemaining)}`}>
              <Clock className="w-3 h-3" />
              {demand.deadline}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dias Restantes</p>
            <p className={`text-lg font-bold mt-0.5 ${deadlineClass(demand.daysRemaining)}`}>
              {demand.daysRemaining <= 0 ? `${Math.abs(demand.daysRemaining)}d atrasado` : `${demand.daysRemaining}d`}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Responsável</p>
            <p className="text-sm font-medium text-foreground mt-0.5">
              {demand.assignedToName || 'Não atribuído'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="andamentos">Andamentos</TabsTrigger>
          <TabsTrigger value="resposta">Resposta</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          {/* Description */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Descrição da Manifestação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{demand.description}</p>
              {demand.attachments && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="w-4 h-4" />
                  {demand.attachments} anexo(s)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Citizen Info */}
          {!demand.anonymous ? (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Dados do Cidadão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {demand.citizenName && (
                    <div>
                      <p className="text-muted-foreground text-xs">Nome</p>
                      <p className="font-medium text-foreground">{demand.citizenName}</p>
                    </div>
                  )}
                  {demand.citizenCpf && (
                    <div>
                      <p className="text-muted-foreground text-xs">CPF</p>
                      <p className="font-medium text-foreground">{demand.citizenCpf}</p>
                    </div>
                  )}
                  {demand.citizenPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground">{demand.citizenPhone}</span>
                    </div>
                  )}
                  {demand.citizenEmail && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground">{demand.citizenEmail}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <CardContent className="p-5 text-center text-muted-foreground text-sm">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Manifestação anônima — dados do cidadão ocultos.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="andamentos" className="space-y-4">
          {/* Add entry */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Novo Andamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de andamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despacho">Despacho</SelectItem>
                  <SelectItem value="encaminhamento">Encaminhamento Interno</SelectItem>
                  <SelectItem value="solicitacao">Solicitação de Informação</SelectItem>
                  <SelectItem value="analise">Análise Técnica</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Descreva o andamento..." className="min-h-[80px]" />
              <div className="flex justify-end">
                <Button size="sm" className="gap-1">
                  <Send className="w-3 h-3" /> Registrar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="relative space-y-0">
                  {history.map((h, i) => (
                    <div key={h.id} className="flex gap-3 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                        {i < history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.action}</p>
                        <p className="text-xs text-muted-foreground">{h.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {h.user} • {h.date}
                        </p>
                        {h.fromStatus && h.toStatus && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusClass(h.fromStatus)}`}>
                              {DEMAND_STATUS_LABELS[h.fromStatus]}
                            </span>
                            <span className="text-muted-foreground text-[10px]">→</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusClass(h.toStatus)}`}>
                              {DEMAND_STATUS_LABELS[h.toStatus]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum andamento registrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resposta" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Resposta ao Cidadão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Digite a resposta para o cidadão..." className="min-h-[150px]" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Classificação de conclusão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="nao_atendimento">Não Atendimento</SelectItem>
                  <SelectItem value="impossibilitado">Impossibilitado</SelectItem>
                  <SelectItem value="orientacao">Resposta Orientação</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" className="gap-1">
                  <Paperclip className="w-3 h-3" /> Anexar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Pré-visualizar</Button>
                  <Button size="sm" className="gap-1">
                    <Send className="w-3 h-3" /> Enviar Resposta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DemandaDetalhe;
