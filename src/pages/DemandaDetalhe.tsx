import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Lock,
  X,
  Sparkles,
  FileUp,
} from 'lucide-react';
import {
  DEMAND_STATUS_LABELS,
  DEMAND_TYPE_LABELS,
  PRIORITY_LABELS,
  CHANNEL_LABELS,
} from '@/types/ouvidoria';
import type { DemandStatus } from '@/types/ouvidoria';
import {
  getDemandById,
  getDemandHistory,
  addDemandHistory,
  updateDemand,
  getOrgans,
  getUsers,
  logAudit,
} from '@/lib/api';
import { calcScore, getScoreBand, SCORE_BAND_CLASS, SCORE_BAND_LABEL, scoreTooltip } from '@/lib/priorityScore';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureTimezone(raw: string): string {
  // Supabase TIMESTAMP (without tz) may come without Z – treat as UTC
  if (raw && !raw.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    return raw + 'Z';
  }
  return raw;
}

function formatDate(raw: string): string {
  if (!raw) return '—';
  const d = new Date(ensureTimezone(raw));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
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

function normalizeFirstLetter(raw?: string | null): string {
  const text = (raw ?? '').trim();
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function maskPhoneIfAnonymous(raw: string, isAnonymous: boolean): string {
  if (!isAnonymous) return raw;

  const chars = raw.split('');
  let digitsMasked = 0;

  for (let i = chars.length - 1; i >= 0 && digitsMasked < 4; i -= 1) {
    if (/\d/.test(chars[i])) {
      chars[i] = '*';
      digitsMasked += 1;
    }
  }

  return chars.join('');
}

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
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();

  // ─── Queries ────────────────────────────────────────────────────────
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

  const { data: organs = [] } = useQuery({
    queryKey: ['organs'],
    queryFn: getOrgans,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  // ─── Andamento (progress entry) state ───────────────────────────────
  const [andamentoType, setAndamentoType] = useState('');
  const [andamentoText, setAndamentoText] = useState('');
  const [submittingAndamento, setSubmittingAndamento] = useState(false);

  // ─── Resposta (response) state ──────────────────────────────────────
  const [respostaText, setRespostaText] = useState('');
  const [respostaClassificacao, setRespostaClassificacao] = useState('');
  const [submittingResposta, setSubmittingResposta] = useState(false);
  const [generatingResposta, setGeneratingResposta] = useState(false);

  // ─── Encaminhar (forward) dialog state ──────────────────────────────
  const [encaminharOpen, setEncaminharOpen] = useState(false);
  const [encaminharOrganId, setEncaminharOrganId] = useState('');
  const [encaminharMotivo, setEncaminharMotivo] = useState('');
  const [submittingEncaminhar, setSubmittingEncaminhar] = useState(false);

  // ─── Atribuir (assign) dialog state ─────────────────────────────────
  const [atribuirOpen, setAtribuirOpen] = useState(false);
  const [atribuirUserId, setAtribuirUserId] = useState('');
  const [submittingAtribuir, setSubmittingAtribuir] = useState(false);

  // ─── Anexo (attachment) state ───────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Knowledge base PDF state ────────────────────────────────────────
  const [knowledgeBasePdf, setKnowledgeBasePdf] = useState<File | null>(null);
  const knowledgeBasePdfRef = useRef<HTMLInputElement>(null);

  // ─── Derived: is demand closed? ─────────────────────────────────────
  const isClosed = demand?.status === 'respondida' || demand?.status === 'concluida' || demand?.status === 'cancelada';
  const attachmentCount = Number(demand?.attachments ?? 0);

  // ─── Action label map ───────────────────────────────────────────────
  const ANDAMENTO_LABELS: Record<string, string> = {
    despacho: 'Despacho',
    encaminhamento: 'Encaminhamento Interno',
    solicitacao: 'Solicitação de Informação',
    analise: 'Análise Técnica',
  };

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleRegistrarAndamento = async () => {
    if (!andamentoType || !andamentoText.trim()) {
      toast({ title: 'Preencha o tipo e a descrição do andamento.', variant: 'destructive' });
      return;
    }
    if (!profile || !demand) {
      console.error('[Andamento] profile or demand is null', { profile, demand });
      toast({ title: 'Erro: perfil ou demanda não carregados.', variant: 'destructive' });
      return;
    }

    setSubmittingAndamento(true);
    try {
      await addDemandHistory({
        demandId: demand.id,
        action: ANDAMENTO_LABELS[andamentoType] || andamentoType,
        description: andamentoText.trim(),
        userId: profile.id,
      });

      // If demand is still "registrada", move to "em_analise"
      if (demand.status === 'registrada') {
        await updateDemand(demand.id, { status: 'em_analise' });
        await addDemandHistory({
          demandId: demand.id,
          action: 'Alteração de Status',
          description: 'Status alterado automaticamente ao registrar andamento.',
          userId: profile.id,
          fromStatus: 'registrada',
          toStatus: 'em_analise',
        });
        queryClient.invalidateQueries({ queryKey: ['demand', id] });
      }

      queryClient.invalidateQueries({ queryKey: ['demand-history', id] });
      setAndamentoType('');
      setAndamentoText('');
      toast({ title: 'Andamento registrado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao registrar andamento.', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingAndamento(false);
    }
  };

  const handleEnviarResposta = async () => {
    if (!respostaText.trim() || !respostaClassificacao) {
      toast({ title: 'Preencha a resposta e a classificação.', variant: 'destructive' });
      return;
    }
    if (!profile || !demand) {
      console.error('[Resposta] profile or demand is null', { profile, demand });
      toast({ title: 'Erro: perfil ou demanda não carregados.', variant: 'destructive' });
      return;
    }

    setSubmittingResposta(true);
    try {
      const CLASSIFICACAO_LABELS: Record<string, string> = {
        resolvido: 'Resolvido',
        nao_atendimento: 'Não Atendimento',
        impossibilitado: 'Impossibilitado',
        orientacao: 'Resposta Orientação',
      };

      // Upload attachment if selected
      let attachmentUrl: string | null = null;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `demands/${demand.id}/${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, selectedFile);
        if (uploadError) throw new Error(`Erro ao enviar anexo: ${uploadError.message}`);

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
        attachmentUrl = urlData.publicUrl;
      }

      const oldStatus = demand.status;
      const newStatus: DemandStatus = 'respondida';

      await updateDemand(demand.id, { status: newStatus });

      const descriptionWithAttachment = attachmentUrl
        ? `${respostaText.trim()}\n\n📎 Anexo: ${attachmentUrl}`
        : respostaText.trim();

      await addDemandHistory({
        demandId: demand.id,
        action: `Resposta ao Cidadão — ${CLASSIFICACAO_LABELS[respostaClassificacao] || respostaClassificacao}`,
        description: descriptionWithAttachment,
        userId: profile.id,
        fromStatus: oldStatus,
        toStatus: newStatus,
      });

      logAudit({
        action: 'generate_response',
        entityType: 'demand',
        entityId: demand.id,
        entityName: demand.protocol,
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        description: `Resposta enviada para demanda ${demand.protocol} — classificação: ${CLASSIFICACAO_LABELS[respostaClassificacao] || respostaClassificacao}`,
        oldValues: { status: oldStatus },
        newValues: { status: newStatus, classificacao: respostaClassificacao },
      });

      queryClient.invalidateQueries({ queryKey: ['demand', id] });
      queryClient.invalidateQueries({ queryKey: ['demand-history', id] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      setRespostaText('');
      setRespostaClassificacao('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'Resposta enviada com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao enviar resposta.', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingResposta(false);
    }
  };

  const handleEncaminhar = async () => {
    if (!encaminharOrganId) {
      toast({ title: 'Selecione o órgão de destino.', variant: 'destructive' });
      return;
    }
    if (!profile || !demand) {
      console.error('[Encaminhar] profile or demand is null', { profile, demand });
      toast({ title: 'Erro: perfil ou demanda não carregados.', variant: 'destructive' });
      return;
    }

    setSubmittingEncaminhar(true);
    try {
      const targetOrgan = organs.find((o) => o.id === encaminharOrganId);
      const oldStatus = demand.status;
      const newStatus: DemandStatus = 'em_atendimento';

      await updateDemand(demand.id, { organId: encaminharOrganId, status: newStatus });

      await addDemandHistory({
        demandId: demand.id,
        action: `Encaminhamento para ${targetOrgan?.acronym || targetOrgan?.name || 'outro órgão'}`,
        description: encaminharMotivo.trim() || 'Demanda encaminhada para outro órgão.',
        userId: profile.id,
        fromStatus: oldStatus,
        toStatus: newStatus,
      });

      logAudit({
        action: 'forward_demand',
        entityType: 'demand',
        entityId: demand.id,
        entityName: demand.protocol,
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        description: `Demanda ${demand.protocol} encaminhada para ${targetOrgan?.acronym || 'outro órgão'}`,
        oldValues: { organId: demand.organId, status: oldStatus },
        newValues: { organId: encaminharOrganId, status: newStatus },
      });

      queryClient.invalidateQueries({ queryKey: ['demand', id] });
      queryClient.invalidateQueries({ queryKey: ['demand-history', id] });
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      setEncaminharOpen(false);
      setEncaminharOrganId('');
      setEncaminharMotivo('');
      toast({ title: 'Demanda encaminhada com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao encaminhar.', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingEncaminhar(false);
    }
  };

  const handleAtribuir = async () => {
    if (!atribuirUserId) {
      toast({ title: 'Selecione o usuário responsável.', variant: 'destructive' });
      return;
    }
    if (!profile || !demand) {
      console.error('[Atribuir] profile or demand is null', { profile, demand });
      toast({ title: 'Erro: perfil ou demanda não carregados.', variant: 'destructive' });
      return;
    }

    setSubmittingAtribuir(true);
    try {
      const targetUser = users.find((u) => u.id === atribuirUserId);

      await updateDemand(demand.id, { assignedToId: atribuirUserId });

      await addDemandHistory({
        demandId: demand.id,
        action: `Atribuição para ${targetUser?.name || 'usuário'}`,
        description: `Demanda atribuída para ${targetUser?.name || 'usuário'}.`,
        userId: profile.id,
      });

      logAudit({
        action: 'assign_demand',
        entityType: 'demand',
        entityId: demand.id,
        entityName: demand.protocol,
        userId: profile.id,
        userName: profile.name,
        userRole: profile.role,
        description: `Demanda ${demand.protocol} atribuída para ${targetUser?.name || 'usuário'}`,
        oldValues: { assignedTo: demand.assignedTo ?? null },
        newValues: { assignedTo: atribuirUserId, assignedToName: targetUser?.name },
      });

      queryClient.invalidateQueries({ queryKey: ['demand', id] });
      queryClient.invalidateQueries({ queryKey: ['demand-history', id] });
      setAtribuirOpen(false);
      setAtribuirUserId('');
      toast({ title: 'Demanda atribuída com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao atribuir.', description: err.message, variant: 'destructive' });
    } finally {
      setSubmittingAtribuir(false);
    }
  };

  const handleGerarRespostaIA = async () => {
    if (!demand) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      toast({ title: 'Chave da API de IA não configurada.', description: 'Defina VITE_GEMINI_API_KEY no arquivo .env.', variant: 'destructive' });
      return;
    }

    const tipoLabel = DEMAND_TYPE_LABELS[demand.type] || demand.type;
    const statusLabel = DEMAND_STATUS_LABELS[demand.status] || demand.status;
    const orgao = demand.organName || 'Órgão responsável';
    const historico = history.length > 0
      ? history.map((h) => `- [${h.action}] ${h.description}`).join('\n')
      : 'Nenhum andamento registrado.';

    const knowledgeBaseInstruction = knowledgeBasePdf
      ? `\n\nVocê também tem acesso a um documento PDF de base de conhecimento (anexado abaixo). Use as informações relevantes desse documento para enriquecer e embasar a resposta ao cidadão.`
      : '';

    const prompt = `Você é um assistente de ouvidoria pública. Com base nas informações abaixo, redija uma resposta formal, clara e empática ao cidadão, adequada para uma ouvidoria municipal/estadual. A resposta deve ser objetiva, informar o resultado do atendimento e encerrar de forma cordial.${knowledgeBaseInstruction}

**Tipo de manifestação:** ${tipoLabel}
**Status atual:** ${statusLabel}
**Órgão responsável:** ${orgao}
**Descrição da manifestação:**
${demand.description}

**Andamentos registrados:**
${historico}

Redija apenas o corpo da resposta ao cidadão, sem saudações genéricas desnecessárias e sem incluir campos de assinatura.`;

    setGeneratingResposta(true);
    try {
      const parts: object[] = [{ text: prompt }];

      if (knowledgeBasePdf) {
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(knowledgeBasePdf);
        });
        parts.push({ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } });
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (generated) {
        setRespostaText(generated.trim());
        logAudit({
          action: 'generate_ai_response',
          entityType: 'demand',
          entityId: demand.id,
          entityName: demand.protocol,
          userId: profile?.id,
          userName: profile?.name,
          userRole: profile?.role,
          description: `Resposta gerada por IA para demanda ${demand.protocol}`,
        });
        toast({ title: 'Resposta gerada com sucesso!' });
      }
    } catch (err: any) {
      toast({ title: 'Erro ao gerar resposta com IA.', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingResposta(false);
    }
  };

  // ─── Loading / not found ────────────────────────────────────────────

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

  if (profile?.role === 'atendente') {
    const isMyOrgan = demand.organId === profile.primaryOrganId || (profile.organs && profile.organs.includes(demand.organId));
    const isAssignedToMe = demand.assignedTo === profile.id;

    if (!isMyOrgan || !isAssignedToMe) {
      return (
        <div className="text-center py-20 px-4">
          <h2 className="text-xl font-bold text-destructive mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-6">Você tem permissão apenas para visualizar demandas do seu órgão e que lhe são atribuídas.</p>
          <Button variant="outline" onClick={() => navigate('/demandas')}>
            Sair desta página
          </Button>
        </div>
      );
    }
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
            {(() => {
              const s = calcScore(demand);
              const band = getScoreBand(s.total);
              return (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${SCORE_BAND_CLASS[band]}`}
                  title={scoreTooltip(s)}
                >
                  Score {s.total} · {SCORE_BAND_LABEL[band]}
                </span>
              );
            })()}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {DEMAND_TYPE_LABELS[demand.type]} • {CHANNEL_LABELS[demand.channel]} • {demand.organName}
          </p>
        </div>
        <div className="flex gap-2">
          {!isClosed && (
            <>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setEncaminharOpen(true)}>
                <Forward className="w-4 h-4" /> Encaminhar
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setAtribuirOpen(true)}>
                <UserPlus className="w-4 h-4" /> Atribuir
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Criada em</p>
            <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              {formatDate(demand.createdAt)}
            </p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prazo</p>
            <p className={`text-sm font-medium mt-0.5 flex items-center gap-1 ${deadlineClass(demand.daysRemaining)}`}>
              <Clock className="w-3 h-3" />
              {formatDate(demand.deadline)}
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

      {/* Closed banner */}
      {isClosed && (
        <Card className="border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-600">Demanda encerrada</p>
              <p className="text-xs text-muted-foreground">
                Esta demanda está com status <strong>{DEMAND_STATUS_LABELS[demand.status]}</strong> e não pode mais receber complementos.
                Para reabrir, utilize a ação "Reabrir" na lista de demandas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="dados" className="space-y-6">
        <TabsList className="bg-card border shadow-sm w-full h-auto p-1.5 flex gap-1 rounded-xl">
          <TabsTrigger 
            value="dados" 
            className="flex-1 text-sm md:text-base font-semibold py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            Dados
          </TabsTrigger>
          <TabsTrigger 
            value="andamentos" 
            className="flex-1 text-sm md:text-base font-semibold py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
          >
            Andamentos
          </TabsTrigger>
          {!isClosed && (
            <TabsTrigger 
              value="resposta" 
              className="flex-1 text-sm md:text-base font-semibold py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all"
            >
              Resposta
            </TabsTrigger>
          )}
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
              {attachmentCount > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="w-4 h-4" />
                  {attachmentCount} anexo(s)
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

          {demand.conversaAtiva && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Dados da Conversa de Origem (Bot)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {demand.conversaAtiva.telefone && (
                    <div>
                      <p className="text-muted-foreground text-xs">Telefone</p>
                      <p className="font-medium text-foreground">
                        {maskPhoneIfAnonymous(demand.conversaAtiva.telefone, !!demand.anonymous)}
                      </p>
                    </div>
                  )}
                  {demand.conversaAtiva.cpf && (
                    <div>
                      <p className="text-muted-foreground text-xs">CPF Informado</p>
                      <p className="font-medium text-foreground">{demand.conversaAtiva.cpf}</p>
                    </div>
                  )}
                  {demand.conversaAtiva.nome && (
                    <div>
                      <p className="text-muted-foreground text-xs">Nome Informado</p>
                      <p className="font-medium text-foreground">{demand.conversaAtiva.nome}</p>
                    </div>
                  )}
                  {demand.conversaAtiva.endereco && (
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-muted-foreground text-xs">Endereço</p>
                      <p className="font-medium text-foreground">
                        {normalizeFirstLetter(demand.conversaAtiva.endereco)}
                        {demand.conversaAtiva.bairro && `, Bairro: ${normalizeFirstLetter(demand.conversaAtiva.bairro)}`}
                        {demand.conversaAtiva.cidade && ` - ${normalizeFirstLetter(demand.conversaAtiva.cidade)}`}
                      </p>
                    </div>
                  )}
                  {demand.conversaAtiva.pontoReferencia && (
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-muted-foreground text-xs">Ponto de Referência</p>
                      <p className="font-medium text-foreground">{normalizeFirstLetter(demand.conversaAtiva.pontoReferencia)}</p>
                    </div>
                  )}
                  {demand.conversaAtiva.dataOcorrencia && (
                    <div>
                      <p className="text-muted-foreground text-xs">Data da Ocorrência</p>
                      <p className="font-medium text-foreground">{formatDate(demand.conversaAtiva.dataOcorrencia)}</p>
                    </div>
                  )}
                  {demand.conversaAtiva.horaOcorrencia && (
                    <div>
                      <p className="text-muted-foreground text-xs">Hora da Ocorrência</p>
                      <p className="font-medium text-foreground">{demand.conversaAtiva.horaOcorrencia}</p>
                    </div>
                  )}
                  {demand.conversaAtiva.descricaoDetalhada && (
                    <div className="col-span-1 md:col-span-2 mt-2">
                      <p className="text-muted-foreground text-xs mb-1">Descrição Detalhada (Bot)</p>
                      <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                        {demand.conversaAtiva.descricaoDetalhada}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="andamentos" className="space-y-4">
          {/* Add entry - only visible when demand is open */}
          {!isClosed ? (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Novo Andamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={andamentoType} onValueChange={setAndamentoType}>
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
                <Textarea
                  placeholder="Descreva o andamento..."
                  className="min-h-[80px]"
                  value={andamentoText}
                  onChange={(e) => setAndamentoText(e.target.value)}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={handleRegistrarAndamento}
                    disabled={submittingAndamento}
                  >
                    {submittingAndamento ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Registrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border shadow-sm bg-muted/30">
              <CardContent className="p-5 text-center text-muted-foreground text-sm">
                <Lock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                Demanda encerrada — não é possível registrar novos andamentos.
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
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
                          {h.user} • {formatDateTime(h.date)}
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

        {!isClosed && (
          <TabsContent value="resposta" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Resposta ao Cidadão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30">
                  <input
                    ref={knowledgeBasePdfRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setKnowledgeBasePdf(e.target.files?.[0] || null)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => knowledgeBasePdfRef.current?.click()}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Base de conhecimento (PDF)
                  </Button>
                  {knowledgeBasePdf ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-background px-2 py-0.5 rounded border ml-auto">
                      <FileText className="w-3 h-3 text-primary" />
                      {knowledgeBasePdf.name}
                      <button
                        type="button"
                        onClick={() => { setKnowledgeBasePdf(null); if (knowledgeBasePdfRef.current) knowledgeBasePdfRef.current.value = ''; }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60 ml-auto pr-1">Nenhum arquivo selecionado</span>
                  )}
                </div>
                <div className="relative">
                  <Textarea
                    placeholder="Digite a resposta para o cidadão..."
                    className="min-h-[150px]"
                    value={respostaText}
                    onChange={(e) => setRespostaText(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 gap-1 text-xs bg-background/90 backdrop-blur-sm border-primary/30 text-primary hover:bg-primary/5"
                    onClick={handleGerarRespostaIA}
                    disabled={generatingResposta}
                  >
                    {generatingResposta ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {generatingResposta ? 'Gerando...' : 'Gerar com IA'}
                  </Button>
                </div>
                <Select value={respostaClassificacao} onValueChange={setRespostaClassificacao}>
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
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-3 h-3" /> Anexar
                    </Button>
                    {selectedFile && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        <Paperclip className="w-3 h-3" />
                        {selectedFile.name}
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={handleEnviarResposta}
                      disabled={submittingResposta}
                    >
                      {submittingResposta ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      Enviar Resposta
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}


      </Tabs>

      {/* ─── Dialog: Encaminhar ─────────────────────────────────────────── */}
      <Dialog open={encaminharOpen} onOpenChange={setEncaminharOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encaminhar Demanda</DialogTitle>
            <DialogDescription className="sr-only">Selecione o órgão de destino para encaminhar esta demanda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={encaminharOrganId} onValueChange={setEncaminharOrganId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o órgão de destino" />
              </SelectTrigger>
              <SelectContent>
                {organs
                  .filter((o) => o.status === 'ativo' && o.id !== demand.organId)
                  .map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.acronym} — {o.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Motivo do encaminhamento (opcional)..."
              className="min-h-[80px]"
              value={encaminharMotivo}
              onChange={(e) => setEncaminharMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncaminharOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEncaminhar} disabled={submittingEncaminhar} className="gap-1">
              {submittingEncaminhar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Forward className="w-4 h-4" />
              )}
              Encaminhar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Atribuir ───────────────────────────────────────────── */}
      <Dialog open={atribuirOpen} onOpenChange={setAtribuirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Responsável</DialogTitle>
            <DialogDescription className="sr-only">Selecione o usuário responsável por esta demanda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={atribuirUserId} onValueChange={setAtribuirUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter((u) => u.status === 'ativo')
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAtribuirOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAtribuir} disabled={submittingAtribuir} className="gap-1">
              {submittingAtribuir ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DemandaDetalhe;
