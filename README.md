# Noctua

Agenda escolar web para centralizar atividades, provas, eventos e avisos do ensino técnico e médio. O produto e suas regras estão em [docs/PROJETO_NOCTUA.md](docs/PROJETO_NOCTUA.md); os materiais complementares, em [docs/CONTEXTO_REFERENCIAS.md](docs/CONTEXTO_REFERENCIAS.md).

## Estado atual

- React, TypeScript e Vite no frontend; NestJS, TypeORM e PostgreSQL no backend.
- Login por cookie HttpOnly, recuperação de senha, convites institucionais e autorização por papel e vínculo.
- Atividades persistidas com rascunho, publicação, edição e cancelamento; agenda por dia, semana ou mês com filtros.
- Checklist individual, avisos, materiais por links HTTPS, perfil e preferências persistidos.
- Coordenação administra turmas, disciplinas, convites e vínculos de usuários existentes.
- Temas claro, escuro e do sistema; alto contraste, OpenDyslexic e widget VLibras.

O banco ativo é PostgreSQL **local**, com dados separados dos testes. O projeto Supabase dedicado recebeu o esquema inicial para uma conexão futura. Upload de arquivos e funcionamento offline são etapas futuras.

Notificações Web Push podem ser ativadas por estudantes em Configurações. As preferências de 24 e 48 horas são individuais; o processador da API agenda lembretes de atividades publicadas e atualiza pendências após alterações, cancelamentos e mudanças de turma. O navegador precisa permitir notificações e funcionar em HTTPS ou localhost. A entrega depende do serviço do navegador e não é garantida.

## Executar

Requisitos: Node.js 22.18+ e PostgreSQL 14+. Nesta instalação, PostgreSQL 18 está disponível na porta local `55432`.

1. Inicie o cluster pela raiz: `backend/scripts/local-test-db.ps1`.
2. No backend: `npm ci`, `npm run migrate`, `npm run start:dev`.
3. No frontend: `npm ci`, `npm run dev`.

Abra `http://localhost:5173`. O acesso inicial da coordenação local está no arquivo ignorado `.local-test/primeiro-acesso.txt`. Em outra instalação, copie `backend/.env.example` para `.env`, configure a conexão, aplique `npm run migrate` e crie a primeira coordenação com `npm run bootstrap:coordinator`.

A API fica em `http://localhost:3000/api`; o Vite encaminha `/api` para ela. Em produção, use `/api` no mesmo domínio ou configure `VITE_API_URL` e `FRONTEND_URL` para origens compatíveis com o cookie SameSite. Produção exige HTTPS e um `JWT_SECRET` forte. SMTP é configurado em `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `MAIL_FROM`; sem SMTP em desenvolvimento, links são registrados somente no log da API.

Para Web Push, defina uma única vez `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` no ambiente da API. Gere o par com `npx web-push generate-vapid-keys` dentro de `backend`; mantenha a chave privada fora do Git e use em produção um contato válido em `VAPID_SUBJECT`. As chaves locais já estão em `backend/.env`. Deixe `PUSH_WORKER_ENABLED=true` em pelo menos uma instância ativa; ele consulta pendências a cada 30 segundos. Alterar as chaves exige que os dispositivos reativem suas inscrições. Envio por e-mail continua indisponível.

## Proteção de contas

Execute `npm run migrate` antes de iniciar a nova versão: a migration 011 cria sessões revogáveis e contadores compartilhados. Sessões anteriores deixam de ser válidas e todos precisam entrar novamente. O logout encerra apenas a sessão atual; uma redefinição de senha encerra todas as sessões da conta. `JWT_EXPIRES_IN` aceita um número inteiro seguido de `s`, `m`, `h` ou `d` e controla a validade do JWT, cookie e registro da sessão.

Por padrão, o login permite 5 tentativas por IP e e-mail e 100 por IP em 15 minutos. A recuperação permite 3 solicitações por IP e e-mail e 30 por IP em uma hora; solicitações adicionais mantêm a resposta genérica e não enviam mensagem. Os limites e janelas podem ser ajustados pelas variáveis `AUTH_LOGIN_*` e `AUTH_RESET_*` de `.env.example`. Acompanhe bloqueios em redes compartilhadas. Identificadores dos contadores são protegidos por HMAC usando `JWT_SECRET`, e dados expirados são removidos periodicamente.

Por padrão, cabeçalhos de encaminhamento são ignorados. Atrás de proxy, configure `TRUSTED_PROXY_CIDRS` com uma lista separada por vírgulas contendo somente endereços ou redes dos proxies sob seu controle; não confie em redes de clientes. O proxy confiável deve substituir os cabeçalhos de encaminhamento recebidos externamente. O banco deve estar disponível para autenticar, aplicar os limites e revogar sessões.

## Verificação

Em cada pacote, execute `npm run build` e `npm test`. Após compilar o backend, rode `backend/scripts/run-local-test.ps1 integration` para testes com PostgreSQL real. A suíte usa a base isolada `postgres` no cluster de testes; a base ativa `noctua` fica separada.

Instruções de conexão, migrations, fixtures de auditoria e preparação do Supabase estão em [docs/BANCO_E_EXECUCAO.md](docs/BANCO_E_EXECUCAO.md).

## GitHub

O remoto `origin` está conectado a [Josue-Neto/Noctua](https://github.com/Josue-Neto/Noctua). A conta conectada tem leitura e aguarda acesso de escrita para enviar alterações e associar o repositório ao Supabase. Configurações `.env`, senhas e dados locais são ignorados pelo Git.
