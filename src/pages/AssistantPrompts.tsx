import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { getAssistantPrompts, updateAssistantPrompt } from '@/lib/api';
import { toast } from 'sonner';
import type { AssistantPrompt } from '@/types/ouvidoria';

const AssistantPrompts = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<string>('orquestrador');
    const [promptsContent, setPromptsContent] = useState<Record<string, string>>({});

    const { data: prompts = [], isLoading } = useQuery({
        queryKey: ['assistant-prompts'],
        queryFn: getAssistantPrompts,
    });

    useEffect(() => {
        if (prompts.length > 0) {
            const contentMap: Record<string, string> = {};
            prompts.forEach((p) => {
                contentMap[p.slug] = p.content;
            });
            setPromptsContent(contentMap);
        }
    }, [prompts]);

    const mutation = useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) =>
            updateAssistantPrompt(id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assistant-prompts'] });
            toast.success('Prompt atualizado com sucesso!');
        },
        onError: (error: any) => {
            console.error('Save error:', error);
            toast.error('Erro ao atualizar prompt: ' + (error.message || 'Erro desconhecido'));
        },
    });

    const handleSave = (slug: string) => {
        const prompt = prompts.find((p) => p.slug === slug);
        if (!prompt) return;

        mutation.mutate({
            id: prompt.id,
            content: promptsContent[slug] || '',
        });
    };

    const handleContentChange = (slug: string, content: string) => {
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
        { slug: 'orquestrador', label: 'Orquestrador', description: 'Prompt principal que decide qual assistente deve ser acionado.' },
        { slug: 'cadastro', label: 'Cadastro de Manifestação', description: 'Diretrizes para o assistente que auxilia o cidadão a registrar uma nova manifestação.' },
        { slug: 'consulta', label: 'Consulta de Manifestação', description: 'Diretrizes para o assistente que ajuda o cidadão a consultar o status de manifestações existentes.' },
        { slug: 'atendimento', label: 'Atendimento Humano', description: 'Instruções para quando a conversa deve ser transferida para um atendente humano.' },
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
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50">
                    {promptTypes.map((type) => (
                        <TabsTrigger key={type.slug} value={type.slug} className="py-2.5 text-xs font-semibold">
                            {type.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {promptTypes.map((type) => {
                    const prompt = prompts.find((p) => p.slug === type.slug);
                    const currentContent = promptsContent[type.slug] || '';
                    const hasChanges = prompt?.content !== currentContent;

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
                                            {mutation.isPending && mutation.variables?.id === prompt?.id ? (
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

export default AssistantPrompts;
