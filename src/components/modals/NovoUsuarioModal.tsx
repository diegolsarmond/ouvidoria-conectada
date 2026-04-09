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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { createUser, updateUser, getOrgans, logAudit } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
    password: '', confirmPassword: '',
};

export function UsuarioModal({ open, onOpenChange, user }: Props) {
    const queryClient = useQueryClient();
    const { profile: currentUser } = useAuth();
    const isEdit = !!user;
    const { data: organs = [] } = useQuery({ queryKey: ['organs'], queryFn: getOrgans });
    const [form, setForm] = useState(emptyForm);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                password: '',
                confirmPassword: '',
            });
        } else {
            setForm(emptyForm);
        }
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, [user, open]);

    const createMutation = useMutation({
        mutationFn: () => createUser({ ...form, password: form.password || undefined }),
        onSuccess: (created) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            logAudit({
                action: 'create_user',
                entityType: 'user',
                entityId: created.id,
                entityName: created.name,
                userId: currentUser?.id,
                userName: currentUser?.name,
                userRole: currentUser?.role,
                description: `Usuário ${created.name} criado com perfil ${ROLE_LABELS[created.role] ?? created.role}`,
                newValues: { name: created.name, email: created.email, role: created.role, status: created.status },
            });
            toast.success('Usuário cadastrado com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const updateMutation = useMutation({
        mutationFn: () => updateUser(user!.id, { ...form, password: form.password || undefined }),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            logAudit({
                action: form.password ? 'update_user_password' : 'update_user',
                entityType: 'user',
                entityId: updated.id,
                entityName: updated.name,
                userId: currentUser?.id,
                userName: currentUser?.name,
                userRole: currentUser?.role,
                description: form.password
                    ? `Senha redefinida para usuário ${updated.name}`
                    : `Usuário ${updated.name} atualizado`,
                oldValues: { role: user!.role, status: user!.status },
                newValues: { role: updated.role, status: updated.status },
            });
            toast.success('Usuário atualizado com sucesso!' + (form.password ? ' Senha redefinida.' : ''));
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

        // Validate password
        if (form.password || form.confirmPassword) {
            if (form.password.length < 6) {
                toast.error('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
            if (form.password !== form.confirmPassword) {
                toast.error('As senhas não coincidem.');
                return;
            }
        }

        // On create, password is required
        if (!isEdit && !form.password) {
            toast.error('Informe uma senha para o novo usuário.');
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

                        {/* Password fields */}
                        <div className="grid gap-2">
                            <Label htmlFor="usr-password">
                                {isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="usr-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={isEdit ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="usr-confirm-password">Confirmar senha{!isEdit && ' *'}</Label>
                            <div className="relative">
                                <Input
                                    id="usr-confirm-password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Repita a senha"
                                    value={form.confirmPassword}
                                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                                </Button>
                            </div>
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
