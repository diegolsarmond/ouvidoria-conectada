import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Link2,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { NetworkErrorBanner } from './NetworkErrorBanner';
import { ROLE_LABELS } from '@/types/ouvidoria';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/demandas', label: 'Demandas', icon: FileText },
  { path: '/orgaos', label: 'Órgãos', icon: Building2 },
  { path: '/usuarios', label: 'Usuários', icon: Users },
  { path: '/vinculos', label: 'Vínculos', icon: Link2 },
  { path: '/assistant-prompts', label: 'Prompt do Assistente', icon: Sparkles, adminOnly: true },
];

const AppLayout = () => {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userName = profile?.name || 'Usuário';
  const userRole = profile?.role ? (ROLE_LABELS[profile.role] || profile.role) : 'Atendente';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <NetworkErrorBanner />
      <div className="h-screen flex bg-background overflow-hidden pt-0">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo */}
          <div className="p-5 flex items-center gap-3 border-b border-sidebar-border">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-sidebar-foreground">Ouvidoria</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Municipal</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-sidebar-foreground/60">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems
              .filter(item => !item.adminOnly || profile?.role === 'administrador')
              .map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-bold text-sidebar-primary">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{userName}</p>
                <p className="text-[10px] text-sidebar-foreground/50 capitalize">{userRole}</p>
              </div>
              <button onClick={handleLogout} className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors" title="Sair">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-foreground/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 border-b bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">3</span>
            </button>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default AppLayout;
