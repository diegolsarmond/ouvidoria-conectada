export type DemandType = 'reclamacao' | 'denuncia' | 'elogio' | 'sugestao' | 'solicitacao';
export type DemandStatus = 'registrada' | 'em_analise' | 'em_atendimento' | 'respondida' | 'concluida' | 'cancelada';
export type DemandPriority = 'baixa' | 'media' | 'alta' | 'urgente';
export type EntryChannel = 'whatsapp' | 'presencial' | 'telefone' | 'email' | 'internet';
export type UserRole = 'administrador' | 'ouvidor' | 'atendente' | 'gestor_orgao';

export interface Organ {
  id: string;
  name: string;
  acronym: string;
  status: 'ativo' | 'inativo';
  email: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  cpf: string;
  email: string;
  registration: string;
  role: UserRole;
  status: 'ativo' | 'inativo';
  organs: string[];
  primaryOrganId?: string;
  avatar?: string;
}

export interface Demand {
  id: string;
  protocol: string;
  type: DemandType;
  status: DemandStatus;
  priority: DemandPriority;
  organId: string;
  organName: string;
  description: string;
  channel: EntryChannel;
  anonymous: boolean;
  citizenName?: string;
  citizenCpf?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  deadline: string;
  daysRemaining: number;
  attachments?: number;
  // Dados do Trabalhador (OCR Dataprev)
  demandanteNome?: string;
  demandanteCpf?: string;
  demandanteDataNascimento?: string;
  demandanteSituacao?: string;
  demandanteSexo?: string;
  demandanteNomeMae?: string;
  demandanteExposicaoPolitica?: string;
  // Dados do Vínculo Empregatício (OCR Dataprev)
  vinculoEmpregadorCnpj?: string;
  vinculoEmpregadorNome?: string;
  vinculoMatricula?: string;
  vinculoDataAdmissao?: string;
  vinculoDataInicioAtividade?: string;
  vinculoBloqueio?: string;
  vinculoElegivel?: string;
  vinculoMotivoInelegibilidade?: string;
  vinculoDataDesligamento?: string;
  vinculoMotivoDesligamento?: string;
  vinculoClassificacaoTributaria?: string;
  vinculoCategoriaTrabalhador?: string;
  vinculoCnae?: string;
  vinculoCbo?: string;
  vinculoPeriodoReferencia?: string;
  conversaAtiva?: ConversaAtiva;
}

export interface ConversaAtiva {
  id: number;
  protocolo: string;
  remotejid?: string;
  anonimo?: boolean;
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  tipoManifestacao?: string;
  area?: string;
  assunto?: string;
  demanda?: string;
  status: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  pontoReferencia?: string;
  dataOcorrencia?: string;
  horaOcorrencia?: string;
  recorrente?: boolean;
  descricaoDetalhada?: string;
  canalOrigem?: string;
  confirmadoUsuario?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DemandHistory {
  id: string;
  demandId: string;
  action: string;
  description: string;
  user: string;
  date: string;
  fromStatus?: DemandStatus;
  toStatus?: DemandStatus;
}

export const DEMAND_TYPE_LABELS: Record<DemandType, string> = {
  reclamacao: 'Reclamação',
  denuncia: 'Denúncia',
  elogio: 'Elogio',
  sugestao: 'Sugestão',
  solicitacao: 'Solicitação',
};

export const DEMAND_STATUS_LABELS: Record<DemandStatus, string> = {
  registrada: 'Registrada',
  em_analise: 'Em Análise',
  em_atendimento: 'Em Atendimento',
  respondida: 'Respondida',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const PRIORITY_LABELS: Record<DemandPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export const CHANNEL_LABELS: Record<EntryChannel, string> = {
  whatsapp: 'WhatsApp',
  presencial: 'Presencial',
  telefone: 'Telefone',
  email: 'Email',
  internet: 'Internet',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  ouvidor: 'Ouvidor',
  atendente: 'Atendente',
  gestor_orgao: 'Gestor de Órgão',
};

export interface AssistantPrompts {
  id: string;
  orquestrador: string;
  cadastro: string;
  consulta: string;
  atendimento: string;
  triagem: string;
  saudacao: string;
  baseConhecimento: string;
  baseConhecimentoPdfUrl?: string | null;
  updatedAt: string;
}
