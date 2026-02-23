import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Mock login - accepts any credentials for demo
    setTimeout(() => {
      if (email && password) {
        localStorage.setItem('ouvidoria_user', JSON.stringify({
          id: '1',
          name: 'Ana Clara Santos',
          role: 'administrador',
          email: email,
        }));
        navigate('/dashboard');
      } else {
        setError('Preencha todos os campos.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 login-gradient items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-primary-foreground/20 rounded-full" />
          <div className="absolute bottom-32 right-16 w-96 h-96 border border-primary-foreground/20 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-primary-foreground/20 rounded-full" />
        </div>
        <div className="relative z-10 text-primary-foreground max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Ouvidoria</h1>
              <p className="text-sm opacity-80 font-medium">Municipal</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-4 leading-tight">
            Sistema de Gestão de Demandas da Ouvidoria
          </h2>
          <p className="text-primary-foreground/70 leading-relaxed">
            Plataforma integrada para registro, acompanhamento e resolução de manifestações dos cidadãos. 
            Transparência e eficiência no atendimento público.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold">1.2k</p>
              <p className="text-sm opacity-70">Demandas/mês</p>
            </div>
            <div>
              <p className="text-3xl font-bold">92%</p>
              <p className="text-sm opacity-70">Resolvidas</p>
            </div>
            <div>
              <p className="text-3xl font-bold">4.8</p>
              <p className="text-sm opacity-70">Satisfação</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ouvidoria</h1>
              <p className="text-xs text-muted-foreground">Municipal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Acessar sistema</h2>
            <p className="text-muted-foreground mt-1">Entre com suas credenciais para continuar</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email ou Matrícula</Label>
                  <Input
                    id="email"
                    placeholder="seu.email@prefeitura.gov.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button type="button" className="text-xs text-accent hover:underline">
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Sistema restrito a servidores autorizados.<br />
            Prefeitura Municipal © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
