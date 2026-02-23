import { Demand, DemandHistory, Organ, User } from '@/types/ouvidoria';

export const mockOrgans: Organ[] = [
  { id: '1', name: 'Secretaria de Obras', acronym: 'SEMOB', status: 'ativo', email: 'obras@prefeitura.gov.br', description: 'Responsável por obras e infraestrutura', createdAt: '2024-01-15', updatedAt: '2025-01-10' },
  { id: '2', name: 'Secretaria de Saúde', acronym: 'SEMSA', status: 'ativo', email: 'saude@prefeitura.gov.br', description: 'Responsável pela saúde pública', createdAt: '2024-01-15', updatedAt: '2025-02-01' },
  { id: '3', name: 'Secretaria de Educação', acronym: 'SEMED', status: 'ativo', email: 'educacao@prefeitura.gov.br', description: 'Responsável pela educação', createdAt: '2024-01-15', updatedAt: '2025-01-20' },
  { id: '4', name: 'Secretaria de Transporte', acronym: 'SEMTRAN', status: 'ativo', email: 'transporte@prefeitura.gov.br', createdAt: '2024-02-01', updatedAt: '2025-01-15' },
  { id: '5', name: 'Secretaria de Meio Ambiente', acronym: 'SEMMA', status: 'inativo', email: 'ambiente@prefeitura.gov.br', createdAt: '2024-03-01', updatedAt: '2024-12-01' },
];

export const mockUsers: User[] = [
  { id: '1', name: 'Ana Clara Santos', cpf: '123.456.789-00', email: 'ana.santos@prefeitura.gov.br', registration: 'MAT-001', role: 'administrador', status: 'ativo', organs: ['1', '2', '3', '4'], primaryOrganId: '1' },
  { id: '2', name: 'Carlos Eduardo Silva', cpf: '234.567.890-11', email: 'carlos.silva@prefeitura.gov.br', registration: 'MAT-002', role: 'ouvidor', status: 'ativo', organs: ['1', '2', '3'], primaryOrganId: '2' },
  { id: '3', name: 'Maria Fernanda Lima', cpf: '345.678.901-22', email: 'maria.lima@prefeitura.gov.br', registration: 'MAT-003', role: 'atendente', status: 'ativo', organs: ['1'], primaryOrganId: '1' },
  { id: '4', name: 'João Pedro Oliveira', cpf: '456.789.012-33', email: 'joao.oliveira@prefeitura.gov.br', registration: 'MAT-004', role: 'gestor_orgao', status: 'ativo', organs: ['2'], primaryOrganId: '2' },
];

export const mockDemands: Demand[] = [
  { id: '1', protocol: '2025000001', type: 'reclamacao', status: 'registrada', priority: 'alta', organId: '1', organName: 'SEMOB', description: 'Buraco na Rua das Flores, esquina com Av. Brasil. Vários veículos já foram danificados.', channel: 'whatsapp', anonymous: false, citizenName: 'Roberto Almeida', citizenPhone: '(69) 99999-0001', citizenEmail: 'roberto@email.com', createdAt: '2025-02-20', deadline: '2025-03-12', daysRemaining: 17, attachments: 2 },
  { id: '2', protocol: '2025000002', type: 'denuncia', status: 'em_analise', priority: 'urgente', organId: '2', organName: 'SEMSA', description: 'Posto de saúde do bairro Centro fechado há 3 dias sem aviso prévio à população.', channel: 'presencial', anonymous: true, createdAt: '2025-02-18', deadline: '2025-03-10', daysRemaining: 15, assignedTo: '4', assignedToName: 'João Pedro Oliveira' },
  { id: '3', protocol: '2025000003', type: 'solicitacao', status: 'em_atendimento', priority: 'media', organId: '3', organName: 'SEMED', description: 'Solicitação de vaga para matrícula na Escola Municipal São Jorge para o 3º ano.', channel: 'email', anonymous: false, citizenName: 'Luciana Martins', citizenEmail: 'luciana@email.com', createdAt: '2025-02-15', deadline: '2025-03-07', daysRemaining: 12, assignedTo: '2', assignedToName: 'Carlos Eduardo Silva' },
  { id: '4', protocol: '2025000004', type: 'elogio', status: 'concluida', priority: 'baixa', organId: '2', organName: 'SEMSA', description: 'Parabenizar a equipe da UBS Norte pelo excelente atendimento na vacinação.', channel: 'internet', anonymous: false, citizenName: 'Teresa Souza', citizenEmail: 'teresa@email.com', createdAt: '2025-02-10', deadline: '2025-03-02', daysRemaining: 0 },
  { id: '5', protocol: '2025000005', type: 'reclamacao', status: 'respondida', priority: 'alta', organId: '4', organName: 'SEMTRAN', description: 'Semáforo da Av. Presidente com defeito há mais de uma semana causando acidentes.', channel: 'telefone', anonymous: false, citizenName: 'Marcos Henrique', citizenPhone: '(69) 98888-0005', createdAt: '2025-02-08', deadline: '2025-02-28', daysRemaining: -2, attachments: 1 },
  { id: '6', protocol: '2025000006', type: 'sugestao', status: 'em_analise', priority: 'baixa', organId: '1', organName: 'SEMOB', description: 'Sugestão para instalação de lombadas na Rua 7 de Setembro próximo à escola.', channel: 'internet', anonymous: false, citizenName: 'Fernanda Costa', citizenEmail: 'fernanda@email.com', createdAt: '2025-02-21', deadline: '2025-03-13', daysRemaining: 18 },
  { id: '7', protocol: '2025000007', type: 'reclamacao', status: 'em_atendimento', priority: 'media', organId: '1', organName: 'SEMOB', description: 'Calçada irregular na frente do mercado municipal dificultando acesso de cadeirantes.', channel: 'presencial', anonymous: false, citizenName: 'Paulo Ricardo', citizenPhone: '(69) 97777-0007', createdAt: '2025-02-12', deadline: '2025-03-04', daysRemaining: 1, assignedTo: '3', assignedToName: 'Maria Fernanda Lima', attachments: 3 },
  { id: '8', protocol: '2025000008', type: 'denuncia', status: 'registrada', priority: 'urgente', organId: '2', organName: 'SEMSA', description: 'Medicamentos vencidos sendo distribuídos na farmácia da UBS Leste.', channel: 'whatsapp', anonymous: true, createdAt: '2025-02-22', deadline: '2025-03-14', daysRemaining: 19 },
];

export const mockHistory: DemandHistory[] = [
  { id: '1', demandId: '1', action: 'Registro', description: 'Demanda registrada no sistema via WhatsApp.', user: 'Sistema', date: '2025-02-20 08:30' },
  { id: '2', demandId: '2', action: 'Registro', description: 'Demanda registrada no sistema via atendimento presencial.', user: 'Maria Fernanda Lima', date: '2025-02-18 10:15' },
  { id: '3', demandId: '2', action: 'Mudança de Status', description: 'Demanda enviada para análise da SEMSA.', user: 'Ana Clara Santos', date: '2025-02-18 14:00', fromStatus: 'registrada', toStatus: 'em_analise' },
  { id: '4', demandId: '2', action: 'Atribuição', description: 'Responsável atribuído: João Pedro Oliveira.', user: 'Ana Clara Santos', date: '2025-02-18 14:05' },
  { id: '5', demandId: '3', action: 'Registro', description: 'Solicitação recebida por email.', user: 'Sistema', date: '2025-02-15 09:00' },
  { id: '6', demandId: '3', action: 'Mudança de Status', description: 'Demanda em atendimento.', user: 'Carlos Eduardo Silva', date: '2025-02-16 11:30', fromStatus: 'em_analise', toStatus: 'em_atendimento' },
];
