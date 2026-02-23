# Mapeamento da Estrutura de Banco de Dados

Este documento descreve as tabelas e relacionamentos necessários para suportar o sistema **Ouvidoria Conectada**.

## Entidades e Relacionamentos

### 1. Órgãos (`organs`)
Armazena as secretarias e departamentos (ex: SEMOB, SEMSA).
- **id** (UUID, PK)
- **name** (VARCHAR): Nome completo do órgão.
- **acronym** (VARCHAR): Sigla (ex: SEMOB).
- **status** (VARCHAR): Status ativo/inativo.
- **email** (VARCHAR): Email de contato.
- **description** (TEXT): Descrição opcional.
- **created_at** (TIMESTAMP)
- **updated_at** (TIMESTAMP)

### 2. Usuários (`users`)
Armazena os funcionários que acessam o sistema administrativo.
- **id** (UUID, PK)
- **name** (VARCHAR)
- **cpf** (VARCHAR, Unique)
- **email** (VARCHAR, Unique)
- **registration** (VARCHAR, Unique): Matrícula do servidor (ex: MAT-001).
- **role** (VARCHAR): Papel no sistema (`administrador`, `ouvidor`, `atendente`, `gestor_orgao`).
- **status** (VARCHAR): Status ativo/inativo.
- **primary_organ_id** (UUID, FK -> organs): Órgão principal do qual o usuário faz parte.
- **avatar** (VARCHAR): URL da foto de perfil.
- *Relacionamento N:M com `organs` para representar acesso a múltiplos órgãos.*

### 3. Vínculos Usuário/Órgão (`user_organs`)
Tabela auxiliar para o relacionamento muitos-para-muitos entre Usuários e Órgãos (um atendente/ouvidor pode atuar em mais de um órgão).
- **user_id** (UUID, FK -> users)
- **organ_id** (UUID, FK -> organs)

### 4. Demandas (`demands`)
Registra as manifestações dos cidadãos na ouvidoria.
- **id** (UUID, PK)
- **protocol** (VARCHAR, Unique): Número de protocolo único gerado (ex: 2025000001).
- **type** (VARCHAR): Tipo de demanda (`reclamacao`, `denuncia`, `elogio`, `sugestao`, `solicitacao`).
- **status** (VARCHAR): Status atual (`registrada`, `em_analise`, `em_atendimento`, `respondida`, `concluida`, `cancelada`).
- **priority** (VARCHAR): Prioridade (`baixa`, `media`, `alta`, `urgente`).
- **organ_id** (UUID, FK -> organs): Órgão responsável pela demanda.
- **description** (TEXT): Detalhamento da manifestação.
- **channel** (VARCHAR): Canal de entrada (`whatsapp`, `presencial`, `telefone`, `email`, `internet`).
- **anonymous** (BOOLEAN): Indica se a demanda foi feita de forma anônima.
- **citizen_name** (VARCHAR): Nome do cidadão (Nulo se anônimo).
- **citizen_cpf** (VARCHAR): CPF do cidadão (Nulo se anônimo).
- **citizen_phone** (VARCHAR): Telefone de contato.
- **citizen_email** (VARCHAR): Email de contato.
- **assigned_to_id** (UUID, FK -> users): Usuário responsável pela demanda.
- **attachments_count** (INT): Quantidade de anexos enviados.
- **deadline** (TIMESTAMP): Prazo final para resolução.
- **created_at** (TIMESTAMP)
- **updated_at** (TIMESTAMP)

### 5. Histórico da Demanda (`demand_history`)
Registro de tudo que acontece com uma demanda (timeline), para auditoria e acompanhamento.
- **id** (UUID, PK)
- **demand_id** (UUID, FK -> demands)
- **action** (VARCHAR): Ação realizada (ex: "Registro", "Mudança de Status", "Atribuição").
- **description** (TEXT): Detalhes da ação.
- **user_id** (UUID, FK -> users): Usuário que realizou a ação (nulo para ações do "Sistema").
- **from_status** (VARCHAR): Status anterior.
- **to_status** (VARCHAR): Status novo.
- **created_at** (TIMESTAMP): Data e hora da ação.
