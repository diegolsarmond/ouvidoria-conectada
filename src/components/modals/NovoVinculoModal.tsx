import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addUserOrganLink, getOrgans, getUsers } from '@/lib/api';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NovoVinculoModal({ open, onOpenChange }: Props) {
    const queryClient = useQueryClient();
    const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });
    const { data: organs = [] } = useQuery({ queryKey: ['organs'], queryFn: getOrgans });

    const [userId, setUserId] = useState('');
    const [organId, setOrganId] = useState('');

    const mutation = useMutation({
        mutationFn: () => addUserOrganLink(userId, organId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Vínculo criado com sucesso!');
            onOpenChange(false);
            setUserId('');
            setOrganId('');
        },
        onError: (err: any) => {
            toast.error('Erro ao criar vínculo: ' + (err.message || 'Erro desconhecido'));
        },
    });

    // Filter organs that the selected user does NOT already have
    const selectedUser = users.find((u) => u.id === userId);
    const availableOrgans = organs.filter(
        (o) => o.status === 'ativo' && (!selectedUser || !selectedUser.organs.includes(o.id))
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !organId) {
            toast.error('Selecione o usuário e o órgão.');
            return;
        }
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setUserId(''); setOrganId(''); } }}>
            <DialogContent className="sm:max-w-[450px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Novo Vínculo</DialogTitle>
                        <DialogDescription>Vincule um usuário a um órgão.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Usuário *</Label>
                            <Select value={userId} onValueChange={(v) => { setUserId(v); setOrganId(''); }}>
                                <SelectTrigger><SelectValue placeholder="Selecione o usuário..." /></SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.registration})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Órgão *</Label>
                            <Select value={organId} onValueChange={setOrganId} disabled={!userId}>
                                <SelectTrigger><SelectValue placeholder={userId ? "Selecione o órgão..." : "Selecione um usuário primeiro"} /></SelectTrigger>
                                <SelectContent>
                                    {availableOrgans.map((o) => (
                                        <SelectItem key={o.id} value={o.id}>{o.acronym} - {o.name}</SelectItem>
                                    ))}
                                    {availableOrgans.length === 0 && userId && (
                                        <div className="px-2 py-1 text-xs text-muted-foreground">Usuário já vinculado a todos os órgãos ativos.</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={mutation.isPending || !userId || !organId}>
                            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Vincular
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
