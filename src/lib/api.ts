import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import type { Organ, User, Demand, DemandHistory, AssistantPrompts } from '@/types/ouvidoria';

// ─── Mappers (snake_case → camelCase) ─────────────────────────────────────────

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

function mapUser(row: any, organIds: string[]): User {
    return {
        id: row.id,
        name: row.name,
        cpf: row.cpf,
        email: row.email,
        registration: row.registration,
        role: row.role,
        status: row.status,
        organs: organIds,
        primaryOrganId: row.primary_organ_id ?? undefined,
        avatar: row.avatar ?? undefined,
    };
}

function mapDemand(row: any): Demand {
    const now = new Date();
    const deadline = new Date(row.deadline);
    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
        id: row.id,
        protocol: row.protocol,
        type: row.type,
        status: row.status,
        priority: row.priority,
        organId: row.organ_id,
        organName: row.organs?.acronym ?? '',
        description: row.description,
        channel: row.channel,
        anonymous: row.anonymous,
        citizenName: row.citizen_name ?? undefined,
        citizenCpf: row.citizen_cpf ?? undefined,
        citizenPhone: row.citizen_phone ?? undefined,
        citizenEmail: row.citizen_email ?? undefined,
        assignedTo: row.assigned_to_id ?? undefined,
        assignedToName: row.assigned_user?.name ?? undefined,
        createdAt: row.created_at,
        deadline: row.deadline,
        daysRemaining,
        attachments: row.attachments_count ?? undefined,
    };
}

function mapHistory(row: any): DemandHistory {
    return {
        id: row.id,
        demandId: row.demand_id,
        action: row.action,
        description: row.description,
        user: row.users?.name ?? 'Sistema',
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
        updatedAt: row.updated_at,
    };
}

// ─── Fetch Functions ──────────────────────────────────────────────────────────

export async function getOrgans(): Promise<Organ[]> {
    const { data, error } = await supabase
        .from('organs')
        .select('*')
        .order('name');

    if (error) throw error;
    return (data ?? []).map(mapOrgan);
}

// Versão sem RLS para uso em páginas públicas (sem sessão autenticada)
export async function getOrgansPublic(): Promise<Organ[]> {
    const { data, error } = await supabaseAdmin
        .from('organs')
        .select('*')
        .order('name');

    if (error) throw error;
    return (data ?? []).map(mapOrgan);
}

export async function getUsers(): Promise<User[]> {
    // Fetch users
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('name');

    if (usersError) throw usersError;

    // Fetch user_organs relationships
    const { data: userOrgansData, error: uoError } = await supabase
        .from('user_organs')
        .select('user_id, organ_id');

    if (uoError) throw uoError;

    // Group organ IDs by user
    const organsByUser: Record<string, string[]> = {};
    for (const uo of userOrgansData ?? []) {
        if (!organsByUser[uo.user_id]) organsByUser[uo.user_id] = [];
        organsByUser[uo.user_id].push(uo.organ_id);
    }

    return (usersData ?? []).map((row) =>
        mapUser(row, organsByUser[row.id] ?? [])
    );
}

export async function getDemands(): Promise<Demand[]> {
    const { data, error } = await supabase
        .from('demands')
        .select('*, organs(acronym), assigned_user:users!assigned_to_id(name)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapDemand);
}

export async function getDemandById(id: string): Promise<Demand | null> {
    const { data, error } = await supabase
        .from('demands')
        .select('*, organs(acronym), assigned_user:users!assigned_to_id(name)')
        .eq('id', id)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    let conversaAtiva = undefined;
    if (data.protocol) {
        const { data: convData } = await supabase
            .from('demanda_whatsapp')
            .select('*')
            .eq('protocolo', data.protocol)
            .maybeSingle();
        
        if (convData) {
            conversaAtiva = {
                id: convData.id,
                protocolo: convData.protocolo,
                remotejid: convData.remotejid,
                anonimo: convData.anonimo,
                nome: convData.nome,
                cpf: convData.cpf,
                telefone: convData.telefone,
                email: convData.email,
                tipoManifestacao: convData.tipo_manifestacao,
                area: convData.area,
                assunto: convData.assunto,
                demanda: convData.demanda,
                status: convData.status,
                endereco: convData.endereco,
                bairro: convData.bairro,
                cidade: convData.cidade,
                pontoReferencia: convData.ponto_referencia,
                dataOcorrencia: convData.data_ocorrencia,
                horaOcorrencia: convData.hora_ocorrencia,
                recorrente: convData.recorrente,
                descricaoDetalhada: convData.descricao_detalhada,
                canalOrigem: convData.canal_origem,
                confirmadoUsuario: convData.confirmado_usuario,
                createdAt: convData.created_at,
                updatedAt: convData.updated_at,
            };
        }
    }

    const demand = mapDemand(data);
    if (conversaAtiva) {
        demand.conversaAtiva = conversaAtiva;
    }
    return demand;
}

export async function getDemandHistory(demandId: string): Promise<DemandHistory[]> {
    const { data, error } = await supabase
        .from('demand_history')
        .select('*, users(name)')
        .eq('demand_id', demandId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapHistory);
}

export async function getAssistantPrompts(): Promise<AssistantPrompts | null> {
    const { data, error } = await supabase
        .from('assistant_prompts')
        .select('*')
        .maybeSingle();

    if (error) throw error;
    return data ? mapAssistantPrompts(data) : null;
}

// ─── Create Functions ─────────────────────────────────────────────────────────

export async function createOrgan(input: {
    name: string;
    acronym: string;
    email: string;
    status: 'ativo' | 'inativo';
    description?: string;
}): Promise<Organ> {
    const { data, error } = await supabase
        .from('organs')
        .insert({
            name: input.name,
            acronym: input.acronym,
            email: input.email,
            status: input.status,
            description: input.description || null,
        })
        .select('*')
        .single();

    if (error) throw error;
    return mapOrgan(data);
}

export async function createUser(input: {
    name: string;
    cpf: string;
    email: string;
    registration: string;
    role: string;
    status: 'ativo' | 'inativo';
    primaryOrganId?: string;
    organIds: string[];
    password?: string;
}): Promise<User> {
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("A chave VITE_SUPABASE_SERVICE_ROLE_KEY não foi configurada. Necessária para criar usuários administradores.");
    }

    const passwordToUse = input.password || Math.random().toString(36).slice(-12) + 'A1!';

    // 1. Criar o usuário no Auth (Identidades, GoTrue) oficialmente usando o Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: passwordToUse,
        email_confirm: true, // Auto-confirmar
        user_metadata: { name: input.name, cpf: input.cpf }
    });

    if (authError) throw authError;

    const newUserId = authData.user.id;

    // 2. Criar o perfil do usuário em public.users
    const { error: profileError } = await supabaseAdmin.from('users').insert({
        id: newUserId,
        name: input.name,
        cpf: input.cpf,
        email: input.email,
        registration: input.registration,
        role: input.role,
        status: input.status,
        primary_organ_id: input.primaryOrganId || null,
    });

    if (profileError) {
        // Fallback: se der erro na tabela public, tenta apagar no auth para não deixar dados órfãos
        await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => { });
        throw profileError;
    }

    // 3. Insert user_organs relationships
    if (input.organIds.length > 0) {
        const { error: uoError } = await supabaseAdmin
            .from('user_organs')
            .insert(input.organIds.map((organId) => ({
                user_id: newUserId,
                organ_id: organId,
            })));
        if (uoError) throw uoError;
    }

    // 4. Fetch the created user to return
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', newUserId)
        .single();

    if (error) throw error;
    return mapUser(data, input.organIds);
}

export async function createDemand(input: {
    type: string;
    priority: string;
    organId: string;
    description: string;
    channel: string;
    anonymous: boolean;
    citizenName?: string;
    citizenCpf?: string;
    citizenPhone?: string;
    citizenEmail?: string;
    deadline: string;
}): Promise<Demand> {
    const { data, error } = await supabase
        .from('demands')
        .insert({
            // O protocolo agora é gerado automaticamente pelo banco via trigger
            type: input.type,
            status: 'registrada',
            priority: input.priority,
            organ_id: input.organId,
            description: input.description,
            channel: input.channel,
            anonymous: input.anonymous,
            citizen_name: input.citizenName || null,
            citizen_cpf: input.citizenCpf || null,
            citizen_phone: input.citizenPhone || null,
            citizen_email: input.citizenEmail || null,
            deadline: input.deadline,
        })
        .select('*, organs(acronym), assigned_user:users!assigned_to_id(name)')
        .single();

    if (error) throw error;
    return mapDemand(data);
}

// Versão sem RLS para uso em páginas públicas (sem sessão autenticada)
export async function createDemandPublic(input: {
    type: string;
    priority: string;
    organId: string;
    description: string;
    channel: string;
    anonymous: boolean;
    citizenName?: string;
    citizenCpf?: string;
    citizenPhone?: string;
    citizenEmail?: string;
    deadline: string;
}): Promise<Demand> {
    const { data, error } = await supabaseAdmin
        .from('demands')
        .insert({
            type: input.type,
            status: 'registrada',
            priority: input.priority,
            organ_id: input.organId,
            description: input.description,
            channel: input.channel,
            anonymous: input.anonymous,
            citizen_name: input.citizenName || null,
            citizen_cpf: input.citizenCpf || null,
            citizen_phone: input.citizenPhone || null,
            citizen_email: input.citizenEmail || null,
            deadline: input.deadline,
        })
        .select('*, organs(acronym), assigned_user:users!assigned_to_id(name)')
        .single();

    if (error) throw error;
    return mapDemand(data);
}

export async function addUserOrganLink(userId: string, organId: string): Promise<void> {
    const { error } = await supabase
        .from('user_organs')
        .insert({ user_id: userId, organ_id: organId });
    if (error) throw error;
}

export async function removeUserOrganLink(userId: string, organId: string): Promise<void> {
    const { error } = await supabase
        .from('user_organs')
        .delete()
        .eq('user_id', userId)
        .eq('organ_id', organId);
    if (error) throw error;
}

// ─── Update Functions ─────────────────────────────────────────────────────────

export async function updateOrgan(id: string, input: {
    name: string;
    acronym: string;
    email: string;
    status: 'ativo' | 'inativo';
    description?: string;
}): Promise<Organ> {
    const { data, error } = await supabase
        .from('organs')
        .update({
            name: input.name,
            acronym: input.acronym,
            email: input.email,
            status: input.status,
            description: input.description || null,
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return mapOrgan(data);
}

export async function updateUser(id: string, input: {
    name: string;
    cpf: string;
    email: string;
    registration: string;
    role: string;
    status: 'ativo' | 'inativo';
    primaryOrganId?: string;
    organIds: string[];
    password?: string;
}): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .update({
            name: input.name,
            cpf: input.cpf,
            email: input.email,
            registration: input.registration,
            role: input.role,
            status: input.status,
            primary_organ_id: input.primaryOrganId || null,
        })
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;

    // Se uma senha for fornecida durante a edição de usuário, usamos a Auth.Admin.API genuína do Supabase
    // Isso atualiza a senha de forma que o GoTrue compreenda, evitando corrupções no Auth
    if (input.password) {
        if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("A chave VITE_SUPABASE_SERVICE_ROLE_KEY não foi configurada no .env para redefinição de senhas.");
        }
        const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
            id,
            { password: input.password }
        );
        if (pwError) throw pwError;
    }

    // Sync user_organs: delete all then re-insert
    const { error: delError } = await supabase
        .from('user_organs')
        .delete()
        .eq('user_id', id);
    if (delError) throw delError;

    if (input.organIds.length > 0) {
        const { error: uoError } = await supabase
            .from('user_organs')
            .insert(input.organIds.map((organId) => ({
                user_id: id,
                organ_id: organId,
            })));
        if (uoError) throw uoError;
    }

    return mapUser(data, input.organIds);
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
    if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("A chave VITE_SUPABASE_SERVICE_ROLE_KEY não foi configurada no .env para redefinição de senhas.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
    );
    if (error) throw error;
}

export async function updateDemand(id: string, input: {
    type?: string;
    status?: string;
    priority?: string;
    organId?: string;
    description?: string;
    channel?: string;
    anonymous?: boolean;
    citizenName?: string;
    citizenCpf?: string;
    citizenPhone?: string;
    citizenEmail?: string;
    assignedToId?: string | null;
    deadline?: string;
}): Promise<Demand> {
    const updatePayload: Record<string, any> = {};
    if (input.type !== undefined) updatePayload.type = input.type;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.priority !== undefined) updatePayload.priority = input.priority;
    if (input.organId !== undefined) updatePayload.organ_id = input.organId;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.channel !== undefined) updatePayload.channel = input.channel;
    if (input.anonymous !== undefined) updatePayload.anonymous = input.anonymous;
    if (input.citizenName !== undefined) updatePayload.citizen_name = input.citizenName || null;
    if (input.citizenCpf !== undefined) updatePayload.citizen_cpf = input.citizenCpf || null;
    if (input.citizenPhone !== undefined) updatePayload.citizen_phone = input.citizenPhone || null;
    if (input.citizenEmail !== undefined) updatePayload.citizen_email = input.citizenEmail || null;
    if (input.assignedToId !== undefined) updatePayload.assigned_to_id = input.assignedToId;
    if (input.deadline !== undefined) updatePayload.deadline = input.deadline;

    const { data, error } = await supabase
        .from('demands')
        .update(updatePayload)
        .eq('id', id)
        .select('*, organs(acronym), assigned_user:users!assigned_to_id(name)')
        .single();

    if (error) throw error;
    return mapDemand(data);
}

export async function addDemandHistory(input: {
    demandId: string;
    action: string;
    description: string;
    userId: string;
    fromStatus?: string;
    toStatus?: string;
}): Promise<DemandHistory> {
    const { data, error } = await supabase
        .from('demand_history')
        .insert({
            demand_id: input.demandId,
            action: input.action,
            description: input.description,
            user_id: input.userId,
            from_status: input.fromStatus ?? null,
            to_status: input.toStatus ?? null,
        })
        .select('*, users(name)')
        .single();

    if (error) throw error;
    return mapHistory(data);
}

export async function updateAssistantPrompts(id: string, updates: Partial<AssistantPrompts>): Promise<AssistantPrompts> {
    const { data, error } = await supabase
        .from('assistant_prompts')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw error;
    return mapAssistantPrompts(data);
}

