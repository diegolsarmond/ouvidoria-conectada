import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createUser, updateUser, getOrgans } from '@/lib/api';
import { ROLE_LABELS, type UserRole, type User } from '@/types/ouvidoria';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
}

const emptyForm = {
    name: '', cpf: '', email: '', registration: '',
    role: 'atendente' as UserRole, status: 'ativo' as 'ativo' | 'inativo',
    primaryOrganId: '', organIds: [] as string[],
};

export function UsuarioModal({ open, onOpenChange, user }: Props) {
    const queryClient = useQueryClient();
    const isEdit = !!user;
    const { data: organs = [] } = useQuery({ queryKey: ['organs'], queryFn: getOrgans });
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name,
                cpf: user.cpf,
                email: user.email,
                registration: user.registration,
                role: user.role,
                status: user.status,
                primaryOrganId: user.primaryOrganId || '',
                organIds: [...user.organs],
            });
        } else {
            setForm(emptyForm);
        }
    }, [user, open]);

    const createMutation = useMutation({
        mutationFn: () => createUser(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuário cadastrado com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const updateMutation = useMutation({
        mutationFn: () => updateUser(user!.id, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Usuário atualizado com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const toggleOrgan = (organId: string) => {
        setForm((prev) => {
            const has = prev.organIds.includes(organId);
            const organIds = has ? prev.organIds.filter((id) => id !== organId) : [...prev.organIds, organId];
            const primaryOrganId = has && prev.primaryOrganId === organId ? '' : prev.primaryOrganId;
            return { ...prev, organIds, primaryOrganId };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.cpf || !form.email || !form.registration) {
            toast.error('Preencha os campos obrigatórios.');
            return;
        }
        if (isEdit) updateMutation.mutate();
        else createMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                        <DialogDescription>{isEdit ? 'Altere os dados do servidor.' : 'Preencha os dados do servidor.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="usr-name">Nome completo *</Label>
                            <Input id="usr-name" placeholder="Nome do servidor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="usr-cpf">CPF *</Label>
                                <Input id="usr-cpf" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="usr-reg">Matrícula *</Label>
                                <Input id="usr-reg" placeholder="MAT-000" value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="usr-email">Email *</Label>
                            <Input id="usr-email" type="email" placeholder="servidor@prefeitura.gov.br" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="usr-role">Perfil *</Label>
                                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                                    <SelectTrigger id="usr-role"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="usr-status">Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                                    <SelectTrigger id="usr-status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ativo">Ativo</SelectItem>
                                        <SelectItem value="inativo">Inativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Órgãos vinculados</Label>
                            <div className="border rounded-md p-3 space-y-2 max-h-[150px] overflow-y-auto">
                                {organs.filter(o => o.status === 'ativo').map((organ) => (
                                    <div key={organ.id} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`org-${organ.id}`}
                                            checked={form.organIds.includes(organ.id)}
                                            onCheckedChange={() => toggleOrgan(organ.id)}
                                        />
                                        <label htmlFor={`org-${organ.id}`} className="text-sm cursor-pointer flex-1">
                                            {organ.name} ({organ.acronym})
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {form.organIds.length > 0 && (
                            <div className="grid gap-2">
                                <Label htmlFor="usr-primary">Órgão principal</Label>
                                <Select value={form.primaryOrganId} onValueChange={(v) => setForm({ ...form, primaryOrganId: v })}>
                                    <SelectTrigger id="usr-primary"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {form.organIds.map((id) => {
                                            const org = organs.find((o) => o.id === id);
                                            return org ? <SelectItem key={id} value={id}>{org.acronym}</SelectItem> : null;
                                        })}
                                    </SelectContent>
                                </Select>
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
