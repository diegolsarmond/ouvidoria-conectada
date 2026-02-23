import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Building2, Loader2 } from 'lucide-react';
import { getOrgans } from '@/lib/api';
import { OrgaoModal } from '@/components/modals/NovoOrgaoModal';
import type { Organ } from '@/types/ouvidoria';

const Orgaos = () => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrgan, setEditingOrgan] = useState<Organ | null>(null);

  const { data: organs = [], isLoading } = useQuery({
    queryKey: ['organs'],
    queryFn: getOrgans,
  });

  const filtered = organs.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.name.toLowerCase().includes(s) || o.acronym.toLowerCase().includes(s);
  });

  const openCreate = () => { setEditingOrgan(null); setModalOpen(true); };
  const openEdit = (organ: Organ) => { setEditingOrgan(organ); setModalOpen(true); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Órgãos</h1>
          <p className="text-muted-foreground text-sm">Cadastro de secretarias e órgãos</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Órgão
        </Button>
      </div>

      <OrgaoModal open={modalOpen} onOpenChange={setModalOpen} organ={editingOrgan} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar órgão..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((organ) => (
            <Card key={organ.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{organ.name}</h3>
                      <p className="text-xs text-muted-foreground">{organ.acronym}</p>
                    </div>
                  </div>
                  <Badge variant={organ.status === 'ativo' ? 'default' : 'secondary'} className="text-[10px]">
                    {organ.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {organ.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{organ.description}</p>
                )}
                <div className="mt-3 text-[10px] text-muted-foreground">
                  {organ.email}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Atualizado: {organ.updatedAt}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(organ)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orgaos;
