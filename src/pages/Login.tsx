import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '@/lib/api-client';
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
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@/types/ouvidoria';
import { useAuth } from '@/contexts/AuthContext';
import { NetworkErrorBanner } from '@/components/NetworkErrorBanner';

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
  const { signIn, signUp, session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');

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

  // Redirect if already authenticated (only after auth loading finishes)
  useEffect(() => {
    if (!authLoading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, authLoading, navigate]);

  // Don't render login form while auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
    setRecoverEmail('');
    setShowPassword(false);
  };

  const switchMode = (newMode: 'login' | 'register' | 'recover') => {
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
      // Navegação feita pelo useEffect acima quando session é definida
    } catch (err: any) {
      const message = err?.message || '';
      if (message.includes('Failed to fetch') || message.includes('Network') || message.includes('ERR_NETWORK')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else if (err.message === 'Invalid login credentials') {
        setError('Email ou senha inválidos.');
      } else if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        setError('Erro de configuração do banco de dados. A migração SQL pode não ter sido executada.');
      } else {
        setError(err.message || 'Erro ao autenticar.');
      }
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
      const message = err?.message || '';
      if (message.includes('Failed to fetch') || message.includes('Network') || message.includes('ERR_NETWORK')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError(err.message || 'Erro ao cadastrar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!recoverEmail) { setError('Informe o email cadastrado.'); return; }
    setLoading(true);
    try {
      const data = await apiPost<any>('/api/auth/reset-password-request', { email: recoverEmail });
      if (data.reset_url) {
        setSuccess(`Token gerado. URL de recuperação: ${data.reset_url}`);
      } else {
        setSuccess('Instruções de recuperação geradas. Contate o administrador do sistema.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NetworkErrorBanner />
      <div className="min-h-screen flex">
        {/* Left panel - branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-border items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-20 w-64 h-64 border border-primary rounded-full" />
            <div className="absolute bottom-32 right-16 w-96 h-96 border border-primary rounded-full" />
            <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-primary rounded-full" />
          </div>
          <div className="relative z-10 max-w-lg flex flex-col items-start">
            {/* Logo maior e levemente elevada */}
            <div className="-mt-8 mb-6">
              <img
                src="/Logo_dataprev_Preferencial-01.png"
                alt="Dataprev"
                className="h-56 object-contain"
              />
            </div>
            {/* Título de impacto */}
            <h1 className="text-5xl font-extrabold leading-tight mb-3 tracking-tight">
              <span className="text-foreground">Ouvidor</span><span style={{color:'#FFCC00'}}>IA</span>
              <br />
              <span className="text-primary">Dataprev</span>
            </h1>
            <div className="w-16 h-1 rounded-full mb-5" style={{background:'#FFCC00'}} />
            <p className="text-muted-foreground leading-relaxed text-base">
              Plataforma integrada para registro, acompanhamento e resolução de manifestações dos cidadãos.
              Transparência e eficiência no atendimento público.
            </p>
          </div>
        </div>

        {/* Right panel - form */}
        <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <img
                src="/Logo_dataprev_Preferencial-01.png"
                alt="Dataprev"
                className="h-12 object-contain"
              />
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {mode === 'login' ? 'Acessar sistema' : mode === 'register' ? 'Cadastro de usuário' : 'Recuperar senha'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {mode === 'login'
                  ? 'Entre com suas credenciais para continuar'
                  : mode === 'register'
                    ? 'Preencha os dados para criar sua conta'
                    : 'Informe seu email para receber o link de redefinição'}
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
                        placeholder="seu.email@dataprev.com.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        <button type="button" onClick={() => switchMode('recover')} className="text-xs text-accent hover:underline">
                          Esqueci minha senha
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
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
                ) : mode === 'register' ? (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Nome completo *</Label>
                      <Input id="reg-name" placeholder="Nome completo do servidor" value={regName} onChange={(e) => setRegName(e.target.value)} autoComplete="name" className="h-11" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-cpf">CPF *</Label>
                        <Input id="reg-cpf" placeholder="000.000.000-00" value={regCpf} onChange={(e) => setRegCpf(cpfMask(e.target.value))} className="h-11" maxLength={14} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-registration">Matrícula *</Label>
                        <Input id="reg-registration" placeholder="MAT-000" value={regRegistration} onChange={(e) => setRegRegistration(e.target.value)} className="h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email institucional *</Label>
                      <Input id="reg-email" type="email" placeholder="seu.email@prefeitura.gov.br" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label>Perfil de acesso *</Label>
                      <Select value={regRole} onValueChange={(v) => setRegRole(v as UserRole)}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
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
                          <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Mín. 6 caracteres" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} autoComplete="new-password" className="h-11 pr-10" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-password-confirm">Confirmar *</Label>
                        <Input id="reg-password-confirm" type={showPassword ? 'text' : 'password'} placeholder="Repita a senha" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} autoComplete="new-password" className="h-11" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cadastrando...</> : 'Criar conta'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleRecover} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="recover-email">Email cadastrado</Label>
                      <Input
                        id="recover-email"
                        type="email"
                        placeholder="seu.email@prefeitura.gov.br"
                        value={recoverEmail}
                        onChange={(e) => setRecoverEmail(e.target.value)}
                        autoComplete="email"
                        className="h-11"
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar link de recuperação'}
                    </Button>
                  </form>
                )}

                {/* Toggle mode */}
                <div className="mt-5 text-center text-sm text-muted-foreground space-y-1">
                  {mode !== 'login' && (
                    <div>
                      <button type="button" onClick={() => switchMode('login')} className="text-accent font-medium hover:underline">
                        Voltar ao login
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                É cidadão e quer registrar uma manifestação?
              </p>
              <Link
                to="/nova-demanda"
                className="inline-block text-sm font-medium text-accent hover:underline"
              >
                Acesse o formulário público →
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Sistema restrito a servidores autorizados.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
