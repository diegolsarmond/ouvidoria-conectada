import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Pencil, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/types/ouvidoria';
import type { User } from '@/types/ouvidoria';
import { getUsers, getOrgans, resetUserPassword, logAudit } from '@/lib/api';
import { UsuarioModal } from '@/components/modals/NovoUsuarioModal';
import { useAuth } from '@/contexts/AuthContext';

const Usuarios = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Reset password dialog state
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const { data: organs = [] } = useQuery({
    queryKey: ['organs'],
    queryFn: getOrgans,
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      resetUserPassword(userId, password),
    onSuccess: (_, { userId }) => {
      const targetUser = users.find((u) => u.id === userId);
      logAudit({
        action: 'reset_password',
        entityType: 'user',
        entityId: userId,
        entityName: targetUser?.name,
        userId: profile?.id,
        userName: profile?.name,
        userRole: profile?.role,
        description: `Senha redefinida pelo administrador para usuário ${targetUser?.name ?? userId}`,
      });
      toast.success('Senha redefinida com sucesso!');
      setResetPwOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');
    },
    onError: (err: any) => toast.error('Erro ao redefinir senha: ' + (err.message || 'Erro desconhecido')),
  });

  const filtered = users.filter((u) => {
    if (profile?.role === 'gestor_orgao' || profile?.role === 'ouvidor') {
      const myOrgans = [...(profile.organs || [])];
      if (profile.primaryOrganId && !myOrgans.includes(profile.primaryOrganId)) {
        myOrgans.push(profile.primaryOrganId);
      }
      
      const uOrgans = [...(u.organs || [])];
      if (u.primaryOrganId && !uOrgans.includes(u.primaryOrganId)) {
        uOrgans.push(u.primaryOrganId);
      }
      
      const hasIntersection = myOrgans.some(org => uOrgans.includes(org));
      if (!hasIntersection) return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.registration.toLowerCase().includes(s);
  });

  const getOrganNames = (organIds: string[]) =>
    organIds.map((id) => organs.find((o) => o.id === id)?.acronym || id);

  const openCreate = () => { setEditingUser(null); setModalOpen(true); };
  const openEdit = (user: User) => { setEditingUser(user); setModalOpen(true); };
  const openResetPw = (user: User) => {
    setResetPwUser(user);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowNewPw(false);
    setShowConfirmNewPw(false);
    setResetPwOpen(true);
  };

  const handleResetPw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Informe a nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (resetPwUser) {
      resetPwMutation.mutate({ userId: resetPwUser.id, password: newPassword });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de servidores</p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <UsuarioModal open={modalOpen} onOpenChange={setModalOpen} user={editingUser} />

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleResetPw}>
            <DialogHeader>
              <DialogTitle>Redefinir Senha</DialogTitle>
              <DialogDescription>
                Defina uma nova senha para <strong>{resetPwUser?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-new-pw">Nova senha *</Label>
                <div className="relative">
                  <Input
                    id="reset-new-pw"
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPw(!showNewPw)}
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reset-confirm-pw">Confirmar nova senha *</Label>
                <div className="relative">
                  <Input
                    id="reset-confirm-pw"
                    type={showConfirmNewPw ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmNewPw(!showConfirmNewPw)}
                  >
                    {showConfirmNewPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetPwOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={resetPwMutation.isPending}>
                {resetPwMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Redefinir Senha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)} title="Editar usuário">
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openResetPw(u)} title="Redefinir senha">
                            <KeyRound className="w-3 h-3" />
                          </Button>
                        </div>
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
