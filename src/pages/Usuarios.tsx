import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Pencil, Loader2 } from 'lucide-react';
import { ROLE_LABELS } from '@/types/ouvidoria';
import { getUsers, getOrgans } from '@/lib/api';

const Usuarios = () => {
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: organs = [] } = useQuery({
    queryKey: ['organs'],
    queryFn: getOrgans,
  });

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.registration.toLowerCase().includes(s);
  });

  const getOrganNames = (organIds: string[]) =>
    organIds.map((id) => organs.find((o) => o.id === id)?.acronym || id);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de servidores</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email ou matrícula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loadingUsers ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Servidor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Matrícula</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Perfil</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Órgãos</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{u.registration}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {getOrganNames(u.organs).map((name) => (
                            <Badge key={name} variant="outline" className="text-[10px] px-1.5">{name}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.status === 'ativo' ? 'default' : 'secondary'} className="text-[10px]">
                          {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Usuarios;
