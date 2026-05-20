import { apiGet, apiPost, apiPut, apiDel, uploadFile, getPublicUrl } from './api-client';
import type { Organ, User, Demand, DemandHistory, AssistantPrompts } from '@/types/ouvidoria';

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    entityName: string | null;
    userId: string | null;
    userName: string | null;
    userRole: string | null;
    description: string | null;
    oldValues: Record<string, any> | null;
    newValues: Record<string, any> | null;
    createdAt: string;
}

export interface LogAuditInput {
    action: string;
    entityType?: string;
    entityId?: string;
    entityName?: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    description?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
}

function mapAuditLog(row: any): AuditLog {
    return {
        id: row.id,
        action: row.action,
        entityType: row.entity_type ?? null,
        entityId: row.entity_id ?? null,
        entityName: row.entity_name ?? null,
        userId: row.user_id ?? null,
        userName: row.user_name ?? null,
        userRole: row.user_role ?? null,
        description: row.description ?? null,
        oldValues: row.old_values ?? null,
        newValues: row.new_values ?? null,
        createdAt: row.created_at,
    };
}

export async function logAudit(input: LogAuditInput): Promise<void> {
    try {
        await apiPost('/api/audit-logs', {
            action: input.action,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            entityName: input.entityName ?? null,
            userId: input.userId ?? null,
            userName: input.userName ?? null,
            userRole: input.userRole ?? null,
            description: input.description ?? null,
            oldValues: input.oldValues ?? null,
            newValues: input.newValues ?? null,
        });
    } catch (err) {
        console.error('[Audit] Falha ao registrar log:', err);
    }
}

export interface GetAuditLogsOptions {
    limit?: number;
    offset?: number;
    action?: string;
    entityType?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export async function getAuditLogs(opts: GetAuditLogsOptions = {}): Promise<{ data: AuditLog[]; count: number }> {
    const params = new URLSearchParams();
    if (opts.action) params.set('action', opts.action);
    if (opts.entityType) params.set('entityType', opts.entityType);
    if (opts.userId) params.set('userId', opts.userId);
    if (opts.dateFrom) params.set('dateFrom', opts.dateFrom);
    if (opts.dateTo) params.set('dateTo', opts.dateTo);
    params.set('limit', String(opts.limit ?? 50));
    params.set('offset', String(opts.offset ?? 0));
    const result = await apiGet<{ data: any[]; count: number }>(`/api/audit-logs?${params}`);
    return { data: result.data.map(mapAuditLog), count: result.count };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapOrgan(row: any): Organ {
    return {
        id: row.id,
        name: row.name,
        acronym: row.acronym,
        status: row.status,
        email: row.email,
        description: row.description ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapUser(row: any): User {
    return {
        id: row.id,
        name: row.name,
        cpf: row.cpf,
        email: row.email,
        registration: row.registration,
        role: row.role,
        status: row.status,
        organs: row.organ_ids ?? [],
        primaryOrganId: row.primary_organ_id ?? undefined,
        avatar: row.avatar ?? undefined,
    };
}

function mapDemand(row: any): Demand {
    const now = new Date();
    const deadline = new Date(row.deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const conversaAtiva = row.conversa_ativa ? {
        id: row.conversa_ativa.id,
        protocolo: row.conversa_ativa.protocolo,
        remotejid: row.conversa_ativa.remotejid,
        anonimo: row.conversa_ativa.anonimo,
        nome: row.conversa_ativa.nome,
        cpf: row.conversa_ativa.cpf,
        telefone: row.conversa_ativa.telefone,
        email: row.conversa_ativa.email,
        tipoManifestacao: row.conversa_ativa.tipo_manifestacao,
        area: row.conversa_ativa.area,
        assunto: row.conversa_ativa.assunto,
        demanda: row.conversa_ativa.demanda,
        status: row.conversa_ativa.status,
        endereco: row.conversa_ativa.endereco,
        bairro: row.conversa_ativa.bairro,
        cidade: row.conversa_ativa.cidade,
        pontoReferencia: row.conversa_ativa.ponto_referencia,
        dataOcorrencia: row.conversa_ativa.data_ocorrencia,
        horaOcorrencia: row.conversa_ativa.hora_ocorrencia,
        recorrente: row.conversa_ativa.recorrente,
        descricaoDetalhada: row.conversa_ativa.descricao_detalhada,
        canalOrigem: row.conversa_ativa.canal_origem,
        confirmadoUsuario: row.conversa_ativa.confirmado_usuario,
        createdAt: row.conversa_ativa.created_at,
        updatedAt: row.conversa_ativa.updated_at,
    } : undefined;

    return {
        id: row.id,
        protocol: row.protocol,
        type: row.type,
        status: row.status,
        priority: row.priority,
        organId: row.organ_id,
        organName: row.organ_acronym ?? '',
        description: row.description,
        channel: row.channel,
        anonymous: row.anonymous,
        citizenName: row.citizen_name ?? undefined,
        citizenCpf: row.citizen_cpf ?? undefined,
        citizenPhone: row.citizen_phone ?? undefined,
        citizenEmail: row.citizen_email ?? undefined,
        assignedTo: row.assigned_to_id ?? undefined,
        assignedToName: row.assigned_user_name ?? undefined,
        createdAt: row.created_at,
        deadline: row.deadline,
        daysRemaining,
        attachments: row.attachments_count ?? undefined,
        conversaAtiva,
        demandanteNome: row.demandante_nome ?? undefined,
        demandanteCpf: row.demandante_cpf ?? undefined,
        demandanteDataNascimento: row.demandante_data_nascimento ?? undefined,
        demandanteSituacao: row.demandante_situacao ?? undefined,
        demandanteSexo: row.demandante_sexo ?? undefined,
        demandanteNomeMae: row.demandante_nome_mae ?? undefined,
        demandanteExposicaoPolitica: row.demandante_exposicao_politica ?? undefined,
        vinculoEmpregadorCnpj: row.vinculo_empregador_cnpj ?? undefined,
        vinculoEmpregadorNome: row.vinculo_empregador_nome ?? undefined,
        vinculoMatricula: row.vinculo_matricula ?? undefined,
        vinculoDataAdmissao: row.vinculo_data_admissao ?? undefined,
        vinculoDataInicioAtividade: row.vinculo_data_inicio_atividade ?? undefined,
        vinculoBloqueio: row.vinculo_bloqueio ?? undefined,
        vinculoElegivel: row.vinculo_elegivel ?? undefined,
        vinculoMotivoInelegibilidade: row.vinculo_motivo_inelegibilidade ?? undefined,
        vinculoDataDesligamento: row.vinculo_data_desligamento ?? undefined,
        vinculoMotivoDesligamento: row.vinculo_motivo_desligamento ?? undefined,
        vinculoClassificacaoTributaria: row.vinculo_classificacao_tributaria ?? undefined,
        vinculoCategoriaTrabalhador: row.vinculo_categoria_trabalhador ?? undefined,
        vinculoCnae: row.vinculo_cnae ?? undefined,
        vinculoCbo: row.vinculo_cbo ?? undefined,
        vinculoPeriodoReferencia: row.vinculo_periodo_referencia ?? undefined,
    };
}

function mapHistory(row: any): DemandHistory {
    return {
        id: row.id,
        demandId: row.demand_id,
        action: row.action,
        description: row.description,
        user: row.user_name ?? 'Sistema',
        date: row.created_at,
        fromStatus: row.from_status ?? undefined,
        toStatus: row.to_status ?? undefined,
    };
}

function mapAssistantPrompts(row: any): AssistantPrompts {
    return {
        id: row.id,
        orquestrador: row.orquestrador ?? '',
        cadastro: row.cadastro ?? '',
        consulta: row.consulta ?? '',
        atendimento: row.atendimento ?? '',
        triagem: row.triagem ?? '',
        saudacao: row.saudacao ?? '',
        baseConhecimento: row.base_conhecimento ?? '',
        baseConhecimentoPdfUrl: row.base_conhecimento_pdf_url ?? null,
        updatedAt: row.updated_at,
    };
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getOrgans(): Promise<Organ[]> {
    const data = await apiGet<any[]>('/api/organs');
    return data.map(mapOrgan);
}

export async function getOrgansPublic(): Promise<Organ[]> {
    return getOrgans();
}

export async function getUsers(): Promise<User[]> {
    const data = await apiGet<any[]>('/api/users');
    return data.map(mapUser);
}

export async function getDemands(): Promise<Demand[]> {
    const data = await apiGet<any[]>('/api/demands');
    return data.map(mapDemand);
}

export async function getDemandById(id: string): Promise<Demand | null> {
    const data = await apiGet<any>(`/api/demands/${id}`);
    return data ? mapDemand(data) : null;
}

export async function getDemandHistory(demandId: string): Promise<DemandHistory[]> {
    const data = await apiGet<any[]>(`/api/demands/${demandId}/history`);
    return data.map(mapHistory);
}

export async function getAssistantPrompts(): Promise<AssistantPrompts | null> {
    const data = await apiGet<any>('/api/assistant-prompts');
    return data ? mapAssistantPrompts(data) : null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createOrgan(input: {
    name: string; acronym: string; email: string;
    status: 'ativo' | 'inativo'; description?: string;
}): Promise<Organ> {
    const data = await apiPost<any>('/api/organs', input);
    return mapOrgan(data);
}

export async function createUser(input: {
    name: string; cpf: string; email: string; registration: string;
    role: string; status: 'ativo' | 'inativo'; primaryOrganId?: string;
    organIds: string[]; password?: string;
}): Promise<User> {
    const data = await apiPost<any>('/api/users', input);
    return mapUser(data);
}

export async function createDemand(input: {
    type: string; priority: string; organId?: string; description: string;
    channel: string; anonymous: boolean; citizenName?: string;
    citizenCpf?: string; citizenPhone?: string; citizenEmail?: string; deadline: string;
}): Promise<Demand> {
    const data = await apiPost<any>('/api/demands', input);
    return mapDemand(data);
}

export async function createDemandPublic(input: {
    type: string; priority: string; organId: string; description: string;
    channel: string; anonymous: boolean; citizenName?: string;
    citizenCpf?: string; citizenPhone?: string; citizenEmail?: string; deadline: string;
}): Promise<Demand> {
    const data = await apiPost<any>('/api/demands/public', input);
    return mapDemand(data);
}

export async function addUserOrganLink(userId: string, organId: string): Promise<void> {
    await apiPost(`/api/users/${userId}/organs`, { organId });
}

export async function removeUserOrganLink(userId: string, organId: string): Promise<void> {
    await apiDel(`/api/users/${userId}/organs/${organId}`);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateOrgan(id: string, input: {
    name: string; acronym: string; email: string;
    status: 'ativo' | 'inativo'; description?: string;
}): Promise<Organ> {
    const data = await apiPut<any>(`/api/organs/${id}`, input);
    return mapOrgan(data);
}

export async function updateUser(id: string, input: {
    name: string; cpf: string; email: string; registration: string;
    role: string; status: 'ativo' | 'inativo'; primaryOrganId?: string;
    organIds: string[]; password?: string;
}): Promise<User> {
    const data = await apiPut<any>(`/api/users/${id}`, input);
    return mapUser(data);
}

export async function toggleUserStatus(userId: string, newStatus: 'ativo' | 'inativo'): Promise<void> {
    await apiPut(`/api/users/${userId}/status`, { status: newStatus });
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
    await apiPut(`/api/users/${userId}/password`, { password: newPassword });
}

export async function updateDemand(id: string, input: {
    type?: string; status?: string; priority?: string; organId?: string;
    description?: string; channel?: string; anonymous?: boolean;
    citizenName?: string; citizenCpf?: string; citizenPhone?: string; citizenEmail?: string;
    assignedToId?: string | null; deadline?: string;
    demandanteNome?: string; demandanteCpf?: string; demandanteDataNascimento?: string;
    demandanteSituacao?: string; demandanteSexo?: string; demandanteNomeMae?: string;
    demandanteExposicaoPolitica?: string; vinculoEmpregadorCnpj?: string;
    vinculoEmpregadorNome?: string; vinculoMatricula?: string; vinculoDataAdmissao?: string;
    vinculoDataInicioAtividade?: string; vinculoBloqueio?: string; vinculoElegivel?: string;
    vinculoMotivoInelegibilidade?: string; vinculoDataDesligamento?: string;
    vinculoMotivoDesligamento?: string; vinculoClassificacaoTributaria?: string;
    vinculoCategoriaTrabalhador?: string; vinculoCnae?: string; vinculoCbo?: string;
    vinculoPeriodoReferencia?: string;
}): Promise<Demand> {
    const data = await apiPut<any>(`/api/demands/${id}`, input);
    return mapDemand(data);
}

export async function addDemandHistory(input: {
    demandId: string; action: string; description: string;
    userId: string; fromStatus?: string; toStatus?: string;
}): Promise<DemandHistory> {
    const data = await apiPost<any>(`/api/demands/${input.demandId}/history`, {
        action: input.action,
        description: input.description,
        userId: input.userId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
    });
    return mapHistory(data);
}

export async function uploadKnowledgeBasePdf(file: File): Promise<string> {
    const fileName = `base_conhecimento_${Date.now()}.${file.name.split('.').pop()}`;
    const { publicUrl } = await uploadFile('knowledge-base', fileName, file);
    return publicUrl;
}

export async function updateAssistantPrompts(id: string, updates: Partial<AssistantPrompts>): Promise<AssistantPrompts> {
    const data = await apiPut<any>(`/api/assistant-prompts/${id}`, updates);
    return mapAssistantPrompts(data);
}

export async function upsertAssistantPrompts(updates: Partial<AssistantPrompts>): Promise<AssistantPrompts> {
    const data = await apiPost<any>('/api/assistant-prompts/upsert', updates);
    return mapAssistantPrompts(data);
}
