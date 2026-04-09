import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createDemand, updateDemand, getOrgans, logAudit } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
    DEMAND_TYPE_LABELS,
    DEMAND_STATUS_LABELS,
    PRIORITY_LABELS,
    CHANNEL_LABELS,
    type Demand,
} from '@/types/ouvidoria';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    demand?: Demand | null;
}

const emptyForm = {
    type: '', priority: '', organId: '', description: '', channel: '',
    anonymous: false, citizenName: '', citizenCpf: '', citizenPhone: '', citizenEmail: '',
    deadline: '', status: '',
};

export function DemandaModal({ open, onOpenChange, demand }: Props) {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const isEdit = !!demand;
    const { data: organs = [] } = useQuery({ queryKey: ['organs'], queryFn: getOrgans });
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (demand) {
            setForm({
                type: demand.type,
                priority: demand.priority,
                organId: demand.organId,
                description: demand.description,
                channel: demand.channel,
                anonymous: demand.anonymous,
                citizenName: demand.citizenName || '',
                citizenCpf: demand.citizenCpf || '',
                citizenPhone: demand.citizenPhone || '',
                citizenEmail: demand.citizenEmail || '',
                deadline: demand.deadline ? demand.deadline.split('T')[0] : '',
                status: demand.status,
            });
        } else {
            setForm(emptyForm);
        }
    }, [demand, open]);

    const createMutation = useMutation({
        mutationFn: () => createDemand(form),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ['demands'] });
            logAudit({
                action: 'create_demand',
                entityType: 'demand',
                entityId: created.id,
                entityName: created.protocol,
                userId: profile?.id,
                userName: profile?.name,
                userRole: profile?.role,
                description: `Demanda ${created.protocol} criada (${DEMAND_TYPE_LABELS[created.type] ?? created.type})`,
                newValues: { type: created.type, priority: created.priority, organId: created.organId, status: created.status },
            });
            toast.success('Demanda cadastrada com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const updateMutation = useMutation({
        mutationFn: () => updateDemand(demand!.id, {
            type: form.type,
            priority: form.priority,
            organId: form.organId,
            description: form.description,
            channel: form.channel,
            anonymous: form.anonymous,
            citizenName: form.citizenName,
            citizenCpf: form.citizenCpf,
            citizenPhone: form.citizenPhone,
            citizenEmail: form.citizenEmail,
            deadline: form.deadline,
            status: form.status,
        }),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['demands'] });
            queryClient.invalidateQueries({ queryKey: ['demand', demand!.id] });
            logAudit({
                action: 'update_demand',
                entityType: 'demand',
                entityId: updated.id,
                entityName: updated.protocol,
                userId: profile?.id,
                userName: profile?.name,
                userRole: profile?.role,
                description: `Demanda ${updated.protocol} editada`,
                oldValues: { type: demand!.type, priority: demand!.priority, status: demand!.status },
                newValues: { type: updated.type, priority: updated.priority, status: updated.status },
            });
            toast.success('Demanda atualizada com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.type || !form.priority || !form.organId || !form.description || !form.channel || !form.deadline) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }
        if (isEdit) updateMutation.mutate();
        else createMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Editar Demanda' : 'Nova Demanda'}</DialogTitle>
                        <DialogDescription>{isEdit ? 'Altere os dados da manifestação.' : 'Registre uma nova manifestação no sistema.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Tipo *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(DEMAND_TYPE_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Prioridade *</Label>
                                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Órgão *</Label>
                                <Select value={form.organId} onValueChange={(v) => setForm({ ...form, organId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {organs.filter(o => o.status === 'ativo').map((o) => (
                                            <SelectItem key={o.id} value={o.id}>{o.acronym} - {o.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Canal de Entrada *</Label>
                                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isEdit && (
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(DEMAND_STATUS_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Prazo *</Label>
                            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Descrição *</Label>
                            <Textarea placeholder="Descreva o relato do cidadão..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[80px]" />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="dem-anonymous"
                                checked={form.anonymous}
                                onCheckedChange={(checked) => setForm({ ...form, anonymous: !!checked })}
                            />
                            <label htmlFor="dem-anonymous" className="text-sm cursor-pointer">Manifestação anônima</label>
                        </div>

                        {!form.anonymous && (
                            <div className="border rounded-md p-3 space-y-3">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Dados do Cidadão</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1">
                                        <Label className="text-xs">Nome</Label>
                                        <Input placeholder="Nome do cidadão" value={form.citizenName} onChange={(e) => setForm({ ...form, citizenName: e.target.value })} />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs">CPF</Label>
                                        <Input placeholder="000.000.000-00" value={form.citizenCpf} onChange={(e) => setForm({ ...form, citizenCpf: e.target.value })} />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs">Telefone</Label>
                                        <Input placeholder="(00) 00000-0000" value={form.citizenPhone} onChange={(e) => setForm({ ...form, citizenPhone: e.target.value })} />
                                    </div>
                                    <div className="grid gap-1">
                                        <Label className="text-xs">Email</Label>
                                        <Input type="email" placeholder="cidadao@email.com" value={form.citizenEmail} onChange={(e) => setForm({ ...form, citizenEmail: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEdit ? 'Salvar' : 'Cadastrar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
