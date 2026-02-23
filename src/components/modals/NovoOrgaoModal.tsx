import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createOrgan, updateOrgan } from '@/lib/api';
import type { Organ } from '@/types/ouvidoria';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    organ?: Organ | null; // If provided, edit mode
}

const emptyForm = { name: '', acronym: '', email: '', status: 'ativo' as 'ativo' | 'inativo', description: '' };

export function OrgaoModal({ open, onOpenChange, organ }: Props) {
    const queryClient = useQueryClient();
    const isEdit = !!organ;
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (organ) {
            setForm({
                name: organ.name,
                acronym: organ.acronym,
                email: organ.email,
                status: organ.status,
                description: organ.description || '',
            });
        } else {
            setForm(emptyForm);
        }
    }, [organ, open]);

    const createMutation = useMutation({
        mutationFn: () => createOrgan(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organs'] });
            toast.success('Órgão cadastrado com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const updateMutation = useMutation({
        mutationFn: () => updateOrgan(organ!.id, form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organs'] });
            toast.success('Órgão atualizado com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => toast.error('Erro: ' + (err.message || 'Erro desconhecido')),
    });

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.acronym || !form.email) {
            toast.error('Preencha os campos obrigatórios.');
            return;
        }
        if (isEdit) updateMutation.mutate();
        else createMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Editar Órgão' : 'Novo Órgão'}</DialogTitle>
                        <DialogDescription>{isEdit ? 'Altere os dados do órgão.' : 'Preencha os dados do órgão ou secretaria.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="org-name">Nome *</Label>
                            <Input id="org-name" placeholder="Ex: Secretaria de Obras" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="org-acronym">Sigla *</Label>
                                <Input id="org-acronym" placeholder="Ex: SEMOB" value={form.acronym} onChange={(e) => setForm({ ...form, acronym: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="org-status">Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                                    <SelectTrigger id="org-status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ativo">Ativo</SelectItem>
                                        <SelectItem value="inativo">Inativo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-email">Email *</Label>
                            <Input id="org-email" type="email" placeholder="orgao@prefeitura.gov.br" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-desc">Descrição</Label>
                            <Textarea id="org-desc" placeholder="Descrição do órgão (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[60px]" />
                        </div>
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
