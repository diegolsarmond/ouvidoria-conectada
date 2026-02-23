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
