import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Users, Building2 } from 'lucide-react';
import { mockUsers, mockOrgans } from '@/data/mockData';
import { ROLE_LABELS } from '@/types/ouvidoria';

const Vinculos = () => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vínculos</h1>
          <p className="text-muted-foreground text-sm">Vinculação de usuários a órgãos</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Novo Vínculo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Organ */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Usuários por Órgão
          </h2>
          {mockOrgans.filter(o => o.status === 'ativo').map((organ) => {
            const users = mockUsers.filter((u) => u.organs.includes(organ.id));
            return (
              <Card key={organ.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>{organ.name} ({organ.acronym})</span>
                    <Badge variant="secondary" className="text-[10px]">{users.length} usuário(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {users.length > 0 ? (
                    <div className="space-y-2">
                      {users.map((u) => (
                        <div key={u.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                              {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-foreground">{u.name}</span>
                            {u.primaryOrganId === organ.id && (
                              <Badge variant="outline" className="text-[9px] px-1">Principal</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum usuário vinculado.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* By User */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" /> Órgãos por Usuário
          </h2>
          {mockUsers.map((user) => {
            const organs = user.organs.map((id) => mockOrgans.find((o) => o.id === id)).filter(Boolean);
            return (
              <Card key={user.id} className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>{user.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[user.role]}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {organs.map((o) => o && (
                      <Badge key={o.id} variant={user.primaryOrganId === o.id ? 'default' : 'outline'} className="text-xs">
                        {o.acronym}
                        {user.primaryOrganId === o.id && ' ★'}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Vinculos;
