import { supabase } from './supabase';
import type { Organ, User, Demand, DemandHistory } from '@/types/ouvidoria';

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

// ─── Fetch Functions ──────────────────────────────────────────────────────────

export async function getOrgans(): Promise<Organ[]> {
    const { data, error } = await supabase
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
    return data ? mapDemand(data) : null;
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
}): Promise<User> {
    const { data, error } = await supabase
        .from('users')
        .insert({
            name: input.name,
            cpf: input.cpf,
            email: input.email,
            registration: input.registration,
            role: input.role,
            status: input.status,
            primary_organ_id: input.primaryOrganId || null,
        })
        .select('*')
        .single();

    if (error) throw error;

    // Insert user_organs relationships
    if (input.organIds.length > 0) {
        const { error: uoError } = await supabase
            .from('user_organs')
            .insert(input.organIds.map((organId) => ({
                user_id: data.id,
                organ_id: organId,
            })));
        if (uoError) throw uoError;
    }

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
    // Generate protocol: year + sequential
    const year = new Date().getFullYear();
    const { count } = await supabase
        .from('demands')
        .select('*', { count: 'exact', head: true });

    const seq = String((count ?? 0) + 1).padStart(6, '0');
    const protocol = `${year}${seq}`;

    const { data, error } = await supabase
        .from('demands')
        .insert({
            protocol,
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

