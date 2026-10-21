# Noctua

Agenda escolar web para centralizar atividades, provas, eventos e avisos de turmas do ensino técnico e médio. O escopo e as regras do produto estão em [docs/PROJETO_NOCTUA.md](docs/PROJETO_NOCTUA.md).

## Tecnologias

- **Web:** React, TypeScript, Vite e Tailwind CSS.
- **Tipografia:** Poppins como padrão e OpenDyslexic como opção de acessibilidade, carregadas localmente.
- **API:** NestJS, TypeORM e PostgreSQL.
- **Notificações:** base preparada para Web Push; requer consentimento no navegador e HTTPS (localhost funciona para desenvolvimento).

## Requisitos

- Node.js 22 ou superior
- npm
- PostgreSQL 14 ou superior

## Configuração local

1. Crie um banco PostgreSQL novo, com o nome definido por `DB_NAME`.
2. Copie `backend/.env.example` para `backend/.env` e configure host, credenciais, `JWT_SECRET` e fuso horário. Copie `frontend/.env.example` para `frontend/.env` se a API usar outro endereço. As chaves VAPID são necessárias quando o envio de Web Push for implementado.
3. Aplique os arquivos de `backend/database/migrations/` em ordem numérica com `psql` e `ON_ERROR_STOP=1`.
4. Em um terminal, instale e inicie a API:

   ```powershell
   cd backend
   npm ci
   npm run start:dev
   ```

5. Em outro terminal, instale e inicie a aplicação web:

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

A API fica em `http://localhost:3000/api`; o frontend, em `http://localhost:5173`. Para apontar o frontend a outra URL, defina `VITE_API_URL`.

## Estrutura

- `frontend/src/pages/`: páginas da landing, agenda, checklist, avisos, perfil e configurações.
- `frontend/src/components/`: componentes reutilizáveis de navegação, atividades, formulários e ícones.
- `frontend/src/context/` e `frontend/src/data/`: estado demonstrativo e conteúdo local do frontend.
- `frontend/src/`: rotas, estilos e inicialização da aplicação.
- `backend/src/`: API NestJS; atualmente inclui configuração do PostgreSQL e `GET /api/health`.
- `backend/database/migrations/`: esquema inicial de turmas, disciplinas, atividades, checklist e notificações.
- `docs/PROJETO_NOCTUA.md`: produto, perfis, jornada, acessibilidade e contratos HTTP propostos.

A interface web inclui landing page, rotas de acesso demonstrativas, agenda, checklist, avisos, perfil com progresso acadêmico e configurações em uma navegação compartilhada. As ações de conta são apenas visuais até a integração com a API. Todos os dados permanecem em memória no navegador; autenticação, autorização, publicação, upload de arquivos, persistência e notificações ainda precisam ser conectados à API. Os formulários e serviços visuais estão separados em páginas, componentes, contexto e dados para apoiar essa integração. As migrations devem ser usadas somente como sequência inicial em um banco novo; consulte o aviso de transição na documentação se você já aplicou o esquema anterior de cursos e aulas.
