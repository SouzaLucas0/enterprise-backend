# 🚀 Enterprise API

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Firebird](https://img.shields.io/badge/Firebird-Legado-orange?logo=firebird&logoColor=white)](https://firebirdsql.org/) [![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?logo=swagger&logoColor=black)](https://swagger.io/)

## 💡 Visão geral
API backend em NestJS para orquestrar automação de processos empresariais, conectar sistemas legados Firebird e disparar comunicações via WhatsApp com monitoramento em tempo real.

### ✨ Principais valores
- Modernização de sistemas legados
- Automação de cobranças, aniversários, NF-e, vendas e ordens de serviço
- Monitoramento ativo de jobs via WebSocket
- Integração direta com serviços de mensagens e notificações

---

## 🧩 O que o projeto entrega
- API REST documentada com Swagger (/docs)
- Validação de entrada de dados com ValidationPipe
- Conexão e leitura de dados em Firebird para rotinas críticas
- Criação e controle de instâncias de WhatsApp
- Listener SSE para captura de mensagens recebidas
- Jobs agendados para cobranças, aniversários, boletos, NF-e, vendas, validação e OS
- Atualização de status em tempo real via WebSocket
- Persistência de dados com TypeORM

---

## 🛠️ Stack técnico
| Camada | Ferramentas |
|---|---|
| Backend | NestJS, TypeScript |
| Persistência | TypeORM, PostgreSQL / SQLite |
| Integração | Firebird, WhatsApp API |
| Documentação | Swagger / OpenAPI |
| Tempo real | Socket.IO / WebSockets |
| Agendamento | @nestjs/schedule |
| Validação | class-validator, class-transformer |

---

## 🧱 Arquitetura resumida
- src/app.module.ts: composição de módulos e integrações
- src/main.ts: bootstrap, Swagger, CORS, inicialização de banco e seed
- src/integrations/firebird: conexão e consultas Firebird
- src/integrations/whatsapp: controle e envio de mensagens
- src/integrations/notifications: gateway WebSocket para alertas
- src/jobs: jobs de negócio agendados
- src/workers/message-listener: listener SSE para WhatsApp

---

## 💿 Instalador Windows

O projeto inclui um instalador completo desenvolvido com **Inno Setup**, localizado em `src/installer`, responsável por automatizar toda a implantação do sistema em ambiente Windows.

### O que o instalador faz

- Instala o sistema em `C:\Enterprise`
- Configura automaticamente os arquivos da aplicação
- Solicita durante a instalação:
  - Chave da API
  - Usuário PostgreSQL
  - Senha PostgreSQL
- Atualiza automaticamente o arquivo `params.ini`
- Localiza a instalação do PostgreSQL (múltiplas versões suportadas)
- Cria automaticamente o banco de dados `enterprise_db`
- Instala e configura os serviços do Windows utilizando **NSSM**
- Inicializa automaticamente:
  - Backend (NestJS)
  - Frontend (Next.js Standalone)
- Configura logs separados para frontend e backend
- Cria atalho na área de trabalho utilizando o Google Chrome em modo App
- Inclui mecanismo de atualização do sistema
- Durante desinstalação remove automaticamente todos os serviços registrados

### Recursos implementados

- ✔ Instalação totalmente automatizada
- ✔ Configuração guiada do ambiente
- ✔ Criação automática do banco PostgreSQL
- ✔ Registro automático dos serviços do Windows
- ✔ Preservação das configurações em atualizações
- ✔ Inicialização automática após reboot
- ✔ Sistema de logs
- ✔ Estrutura preparada para atualizações futuras

> O objetivo do instalador é permitir que usuários finais realizem a implantação do sistema sem necessidade de instalar Node.js, configurar serviços manualmente ou executar comandos em terminal.

---

## ▶️ Como rodar localmente
1. Instale as dependências:
   `ash
   npm install
   `
2. Configure params.ini e variáveis de ambiente conforme o ambiente local.
3. Execute em modo de desenvolvimento:
   `ash
   npm run start:dev
   `
4. Acesse:
   - http://localhost:4000/docs
   - http://localhost:4000/health

---

## 🔧 Comandos úteis
- 
pm run start — servidor em produção
- 
pm run start:dev — modo desenvolvimento com watch
- 
pm run build — compila o projeto
- 
pm run lint — lint e formatação
- 
pm run test — testes unitários
- 
pm run test:e2e — testes de integração
- 
pm run test:cov — cobertura de testes

---

## 🌟 Destaques para recrutadores

- Backend modular e organizado por domínio
- Integração entre sistemas legados e serviços modernos
- Implementação de mensageria em tempo real
- Jobs e automações recorrentes confiáveis
- Uso de validação e documentação profissional
- Desenvolvimento de instalador Windows com Inno Setup
- Automação de deploy, criação de banco PostgreSQL e registro de Windows Services
- Distribuição desktop utilizando Next.js Standalone + NSSM

---

## 📌 Endpoints principais
| Endpoint | Descrição |
|---|---|
| GET /health | health check |
| GET /docs | Swagger UI |
| GET /firebird | teste de conexão Firebird |

---

## 📝 Observações
- O projeto inclui seed automática e inicialização de banco no startup.
- A integração de WhatsApp depende de credenciais configuradas em params.ini.
- Porta padrão: 4000

---

## 📬 Contato
- LinkedIn: linkedin.com/in/souzalucas0/
- GitHub: github.com/SouzaLucas0

> OBS: ainda possui melhorias a serem aplicadas, porém o cliente ao qual o sistema desenvolvido pediu para dar uma pausa no desenvolvimento enquanto o mesmo gera fluxo de caixa com assinaturas da versão vigente.
