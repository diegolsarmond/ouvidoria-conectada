import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { createDemand, getOrgans } from '@/lib/api';
import { DEMAND_TYPE_LABELS } from '@/types/ouvidoria';

const cpfMask = (value: string) =>
    value.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const phoneMask = (value: string) =>
    value.replace(/\D/g, '').slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');

const getDefaultDeadline = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
};

const emptyForm = {
    type: '',
    organId: '',
    description: '',
    anonymous: true,
    citizenName: '',
    citizenCpf: '',
    citizenPhone: '',
    citizenEmail: '',
};

export default function NovaDemandaPublica() {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [protocol, setProtocol] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    const { data: organs = [], isLoading: organsLoading } = useQuery({
        queryKey: ['organs-public'],
        queryFn: getOrgans,
    });

    const activeOrgans = organs.filter(o => o.status === 'ativo');

    const mutation = useMutation({
        mutationFn: () => createDemand({
            type: form.type,
            priority: 'media',
            organId: form.organId,
            description: form.description,
            channel: 'internet',
            anonymous: form.anonymous,
            citizenName: form.anonymous ? undefined : form.citizenName,
            citizenCpf: form.anonymous ? undefined : form.citizenCpf,
            citizenPhone: form.anonymous ? undefined : form.citizenPhone,
            citizenEmail: form.anonymous ? undefined : form.citizenEmail,
            deadline: getDefaultDeadline(),
        }),
        onSuccess: (demand) => {
            setProtocol(demand.protocol);
            setStep('success');
        },
        onError: (err: any) => {
            setError('Erro ao registrar manifestação: ' + (err.message || 'Tente novamente.'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.type) { setError('Selecione o tipo de manifestação.'); return; }
        if (!form.organId) { setError('Selecione o órgão responsável.'); return; }
        if (form.description.trim().length < 20) { setError('A descrição deve ter pelo menos 20 caracteres.'); return; }
        if (!form.anonymous && !form.citizenName.trim()) { setError('Informe seu nome ou marque a opção de manifestação anônima.'); return; }

        mutation.mutate();
    };

    const handleReset = () => {
        setForm(emptyForm);
        setProtocol('');
        setError('');
        setStep('form');
    };

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center shadow-lg">
                    <CardContent className="pt-8 pb-8 space-y-4">
                        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
                        <h2 className="text-2xl font-bold text-foreground">Manifestação registrada!</h2>
                        <p className="text-muted-foreground">Sua manifestação foi recebida com sucesso.</p>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Número do protocolo</p>
                            <p className="text-2xl font-mono font-bold text-primary">{protocol}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Guarde este número para acompanhar o andamento da sua manifestação.
                        </p>
                        <Button variant="outline" onClick={handleReset} className="w-full mt-2">
                            Registrar outra manifestação
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-6">
                {/* Cabeçalho */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-primary">
                        <Shield className="w-8 h-8" />
                        <span className="text-2xl font-bold">Ouvidoria Conectada</span>
                    </div>
                    <p className="text-muted-foreground">Registre sua manifestação online</p>
                </div>

                {/* Formulário */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg">Nova Manifestação</CardTitle>
                        <CardDescription>
                            Preencha os campos abaixo. Campos marcados com * são obrigatórios.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Tipo */}
                            <div className="space-y-1.5">
                                <Label>Tipo de Manifestação *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(DEMAND_TYPE_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Órgão */}
                            <div className="space-y-1.5">
                                <Label>Órgão Responsável *</Label>
                                <Select value={form.organId} onValueChange={(v) => setForm({ ...form, organId: v })} disabled={organsLoading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={organsLoading ? 'Carregando...' : 'Selecione o órgão...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeOrgans.map((o) => (
                                            <SelectItem key={o.id} value={o.id}>{o.acronym} — {o.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Descrição */}
                            <div className="space-y-1.5">
                                <Label>Descrição *</Label>
                                <Textarea
                                    placeholder="Descreva sua manifestação com detalhes..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="min-h-[120px] resize-none"
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {form.description.trim().length} caracteres (mín. 20)
                                </p>
                            </div>

                            {/* Anonimato */}
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="anonymous"
                                    checked={form.anonymous}
                                    onCheckedChange={(checked) => setForm({ ...form, anonymous: !!checked })}
                                />
                                <label htmlFor="anonymous" className="text-sm cursor-pointer select-none">
                                    Prefiro não me identificar (manifestação anônima)
                                </label>
                            </div>

                            {/* Dados do cidadão (quando não anônimo) */}
                            {!form.anonymous && (
                                <div className="border rounded-md p-4 space-y-3">
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        Seus Dados
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">Nome completo *</Label>
                                            <Input
                                                placeholder="Seu nome"
                                                value={form.citizenName}
                                                onChange={(e) => setForm({ ...form, citizenName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">CPF</Label>
                                            <Input
                                                placeholder="000.000.000-00"
                                                value={form.citizenCpf}
                                                onChange={(e) => setForm({ ...form, citizenCpf: cpfMask(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Telefone</Label>
                                            <Input
                                                placeholder="(00) 00000-0000"
                                                value={form.citizenPhone}
                                                onChange={(e) => setForm({ ...form, citizenPhone: phoneMask(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <Label className="text-xs">E-mail</Label>
                                            <Input
                                                type="email"
                                                placeholder="seu@email.com"
                                                value={form.citizenEmail}
                                                onChange={(e) => setForm({ ...form, citizenEmail: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Erro */}
                            {error && (
                                <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Botão */}
                            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Enviar Manifestação
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    Suas informações são tratadas com confidencialidade conforme a legislação vigente.
                </p>
            </div>
        </div>
    );
}
