import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { getAssistantPrompts, updateAssistantPrompts, logAudit } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AssistantPrompts } from '@/types/ouvidoria';

const AssistantPromptsPage = () => {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<string>('orquestrador');
    const [promptsContent, setPromptsContent] = useState<Partial<AssistantPrompts>>({});

    const { data: prompts, isLoading } = useQuery({
        queryKey: ['assistant-prompts'],
        queryFn: getAssistantPrompts,
    });

    useEffect(() => {
        if (prompts) {
            setPromptsContent(prompts);
        }
    }, [prompts]);

    const mutation = useMutation({
        mutationFn: (updates: Partial<AssistantPrompts>) => {
            if (!prompts?.id) throw new Error('ID do registro não encontrado');
            return updateAssistantPrompts(prompts.id, updates);
        },
        onSuccess: (_, updates) => {
            queryClient.invalidateQueries({ queryKey: ['assistant-prompts'] });
            const slug = Object.keys(updates)[0];
            logAudit({
                action: 'update_prompts',
                entityType: 'prompt',
                entityId: prompts?.id,
                entityName: slug,
                userId: profile?.id,
                userName: profile?.name,
                userRole: profile?.role,
                description: `Prompt "${slug}" atualizado`,
                newValues: { slug },
            });
            toast.success('Prompt atualizado com sucesso!');
        },
        onError: (error: any) => {
            console.error('Save error:', error);
            toast.error('Erro ao atualizar prompt: ' + (error.message || 'Erro desconhecido'));
        },
    });

    const handleSave = (slug: keyof AssistantPrompts) => {
        if (!prompts) return;

        mutation.mutate({
            [slug]: promptsContent[slug],
        } as Partial<AssistantPrompts>);
    };

    const handleContentChange = (slug: keyof AssistantPrompts, content: string) => {
        setPromptsContent((prev) => ({
            ...prev,
            [slug]: content,
        }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const promptTypes = [
        { slug: 'saudacao' as keyof AssistantPrompts, label: 'Saudação', description: 'Mensagem de boas-vindas e apresentação inicial do assistente.' },
        { slug: 'orquestrador' as keyof AssistantPrompts, label: 'Orquestrador', description: 'Prompt principal que decide qual assistente deve ser acionado.' },
        { slug: 'triagem' as keyof AssistantPrompts, label: 'Triagem', description: 'Diretrizes para coletar informações iniciais da manifestação.' },
        { slug: 'cadastro' as keyof AssistantPrompts, label: 'Cadastro de Manifestação', description: 'Diretrizes para o assistente que auxilia o cidadão a registrar uma nova manifestação.' },
        { slug: 'consulta' as keyof AssistantPrompts, label: 'Consulta de Manifestação', description: 'Diretrizes para o assistente que ajuda o cidadão a consultar o status de manifestações existentes.' },
        { slug: 'atendimento' as keyof AssistantPrompts, label: 'Atendimento Humano', description: 'Instruções para quando a conversa deve ser transferida para um atendente humano.' },
        { slug: 'baseConhecimento' as keyof AssistantPrompts, label: 'Base de Conhecimento', description: 'Informações e diretrizes gerais sobre as políticas e procedimentos da ouvidoria.' },
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Prompt do Assistente</h1>
                </div>
                <p className="text-muted-foreground text-sm">Configure o comportamento e as diretrizes dos assistentes de IA.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-auto p-1 bg-muted/50">
                    {promptTypes.map((type) => (
                        <TabsTrigger key={type.slug} value={type.slug} className="py-2.5 text-xs font-semibold">
                            {type.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {promptTypes.map((type) => {
                    const originalContent = (prompts?.[type.slug] as string) || '';
                    const currentContent = (promptsContent[type.slug] as string) || '';
                    const hasChanges = originalContent !== currentContent;

                    return (
                        <TabsContent key={type.slug} value={type.slug} className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{type.label}</CardTitle>
                                    <CardDescription>{type.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-foreground">Instruções do Sistema (Prompt)</label>
                                        <Textarea
                                            placeholder="Digite aqui as instruções para o assistente..."
                                            className="min-h-[400px] font-mono text-sm leading-relaxed"
                                            value={currentContent}
                                            onChange={(e) => handleContentChange(type.slug, e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            className="gap-2"
                                            onClick={() => handleSave(type.slug)}
                                            disabled={!hasChanges || mutation.isPending}
                                        >
                                            {mutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
};

export default AssistantPromptsPage;
