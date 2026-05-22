import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Sparkles, Upload } from 'lucide-react';
import { getAssistantPrompts, updateAssistantPrompts, upsertAssistantPrompts, uploadKnowledgeBasePdf, logAudit } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AssistantPrompts } from '@/types/ouvidoria';

const AssistantPromptsPage = () => {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<string>('baseConhecimento');
    const [promptsContent, setPromptsContent] = useState<Partial<AssistantPrompts>>({});
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);

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
            if (prompts?.id) {
                return updateAssistantPrompts(prompts.id, updates);
            }
            // Nenhum registro existe ainda — cria o primeiro
            return upsertAssistantPrompts(updates);
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
        mutation.mutate({
            [slug]: promptsContent[slug],
        } as Partial<AssistantPrompts>);
    };

    const handlePdfUpload = async (file: File) => {
        setIsUploadingPdf(true);
        try {
            const url = await uploadKnowledgeBasePdf(file);
            // Salva a URL diretamente no banco
            if (prompts?.id) {
                await updateAssistantPrompts(prompts.id, { baseConhecimentoPdfUrl: url });
            } else {
                await upsertAssistantPrompts({ baseConhecimentoPdfUrl: url });
            }
            queryClient.invalidateQueries({ queryKey: ['assistant-prompts'] });
            toast.success(`PDF "${file.name}" salvo com sucesso!`);
        } catch (err: any) {
            console.error('Erro no upload do PDF:', err);
            toast.error('Erro ao fazer upload do PDF: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsUploadingPdf(false);
        }
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
                {promptTypes.map((type) => {
                    const originalContent = (prompts?.[type.slug] as string) || '';
                    const currentContent = (promptsContent[type.slug] as string) || '';
                    // Habilita o botão se houve mudança OU se não existe registro ainda e há conteúdo
                    const hasChanges = !prompts ? currentContent.length > 0 : originalContent !== currentContent;

                    return (
                        <TabsContent key={type.slug} value={type.slug} className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{type.label}</CardTitle>
                                    <CardDescription>{type.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {type.slug === 'baseConhecimento' && (
                                        <div className="flex flex-col gap-2 pb-4 border-b border-border/50">
                                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                                <Upload className="w-4 h-4" />
                                                Documento PDF (Base de Conhecimento)
                                            </label>
                                            <Input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                disabled={isUploadingPdf}
                                                className="cursor-pointer file:cursor-pointer"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handlePdfUpload(file);
                                                }}
                                            />
                                            {isUploadingPdf && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Enviando PDF...
                                                </p>
                                            )}
                                            {prompts?.baseConhecimentoPdfUrl && !isUploadingPdf && (
                                                <p className="text-xs text-muted-foreground">
                                                    PDF atual:{' '}
                                                    <a
                                                        href={prompts.baseConhecimentoPdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary underline hover:no-underline"
                                                    >
                                                        Visualizar arquivo salvo
                                                    </a>
                                                </p>
                                            )}
                                            {!prompts?.baseConhecimentoPdfUrl && !isUploadingPdf && (
                                                <p className="text-xs text-muted-foreground">
                                                    Faça upload de um arquivo PDF com informações e diretrizes gerais.
                                                </p>
                                            )}
                                        </div>
                                    )}
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
