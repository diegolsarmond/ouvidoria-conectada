import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/types/ouvidoria';
import { useAuth } from '@/contexts/AuthContext';

const cpfMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp, session } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRegistration, setRegRegistration] = useState('');
  const [regRole, setRegRole] = useState<UserRole | ''>('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  if (session) return null;


  const resetFields = () => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setRegName('');
    setRegCpf('');
    setRegEmail('');
    setRegRegistration('');
    setRegRole('');
    setRegPassword('');
    setRegPasswordConfirm('');
    setShowPassword(false);
  };

  const switchMode = (newMode: 'login' | 'register') => {
    resetFields();
    setMode(newMode);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email ou senha inválidos.'
        : (err.message || 'Erro ao autenticar.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName || !regCpf || !regEmail || !regRegistration || !regRole || !regPassword || !regPasswordConfirm) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const cpfDigits = regCpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) { setError('CPF inválido. Deve conter 11 dígitos.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail)) { setError('Email inválido.'); return; }

    if (regPassword.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (regPassword !== regPasswordConfirm) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      await signUp({
        name: regName,
        cpf: regCpf,
        email: regEmail,
        registration: regRegistration,
        role: regRole,
        password: regPassword,
      });
      setSuccess('Cadastro realizado com sucesso! Faça login para continuar.');
      setTimeout(() => switchMode('login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
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

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
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

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? 'Acessar sistema' : 'Cadastro de usuário'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {mode === 'login'
                ? 'Entre com suas credenciais para continuar'
                : 'Preencha os dados para criar sua conta'}
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              {/* Alerts */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-status-completed/10 text-status-completed text-sm mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@prefeitura.gov.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Senha</Label>
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
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</> : 'Entrar'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Nome completo *</Label>
                    <Input
                      id="reg-name"
                      placeholder="Nome completo do servidor"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-cpf">CPF *</Label>
                      <Input
                        id="reg-cpf"
                        placeholder="000.000.000-00"
                        value={regCpf}
                        onChange={(e) => setRegCpf(cpfMask(e.target.value))}
                        className="h-11"
                        maxLength={14}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-registration">Matrícula *</Label>
                      <Input
                        id="reg-registration"
                        placeholder="MAT-000"
                        value={regRegistration}
                        onChange={(e) => setRegRegistration(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email institucional *</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="seu.email@prefeitura.gov.br"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Perfil de acesso *</Label>
                    <Select value={regRole} onValueChange={(v) => setRegRole(v as UserRole)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Senha *</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mín. 6 caracteres"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
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
                    <div className="space-y-2">
                      <Label htmlFor="reg-password-confirm">Confirmar *</Label>
                      <Input
                        id="reg-password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Repita a senha"
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cadastrando...</> : 'Criar conta'}
                  </Button>
                </form>
              )}

              {/* Toggle mode */}
              <div className="mt-5 text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>
                    Não tem uma conta?{' '}
                    <button type="button" onClick={() => switchMode('register')} className="text-accent font-medium hover:underline">
                      Cadastre-se
                    </button>
                  </>
                ) : (
                  <>
                    Já possui conta?{' '}
                    <button type="button" onClick={() => switchMode('login')} className="text-accent font-medium hover:underline">
                      Fazer login
                    </button>
                  </>
                )}
              </div>
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
