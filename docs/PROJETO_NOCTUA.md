# Noctua — agenda digital escolar

## O produto

O Noctua é uma agenda escolar web que centraliza atividades, provas, eventos e avisos oficiais para estudantes do ensino técnico e médio. A proposta responde à dispersão de informações em conversas e recados: a pesquisa do projeto reportou que 83,8% dos estudantes já perderam prazos por falhas de comunicação e que 100% vivenciaram alterações de datas anunciadas tarde.

O produto atende dois perfis:

- **Estudante:** consulta prazos por data e disciplina, acessa orientações e anexos, recebe lembretes e mantém um checklist pessoal.
- **Professor/coordenação:** publica e atualiza atividades, provas, eventos e avisos para uma turma, anexa materiais e mantém a comunicação oficial em um só lugar.

Este projeto será uma aplicação **web responsiva**, feita com React, TypeScript, Vite e Tailwind CSS. A experiência deve funcionar em telas pequenas e grandes; não é um aplicativo React Native.

## Escopo principal

### Área do estudante

- Visão geral com próximos prazos, pendências e avisos.
- Agenda e lista de atividades filtráveis por período, tipo e disciplina.
- Detalhe da atividade com descrição, prazo e acesso aos documentos anexados.
- Checklist individual para marcar e desmarcar atividades sem alterar o registro oficial visível à turma.
- Notificações web opcionais antes dos vencimentos.
- Preferências de acessibilidade, incluindo modo de alto contraste.

### Área de professor/coordenação

- Publicar e editar atividades, provas, eventos e avisos destinados a uma turma e disciplina.
- Informar título, instruções, data e horário e anexar arquivos ou links.
- Corrigir ou cancelar um prazo; alterações publicadas devem atualizar a agenda e os lembretes dos estudantes.
- Confirmar ações que removem ou cancelam um registro publicado.

## Regras e jornada

1. Atividades pertencem a uma turma e disciplina e têm um autor com permissão de professor ou coordenação.
2. Rascunhos não aparecem para estudantes. Apenas atividades publicadas entram na agenda e geram lembretes.
3. A agenda oficial é compartilhada com os estudantes da turma. Marcar uma atividade concluída altera somente o checklist individual daquele estudante.
4. A API deve verificar o perfil e o vínculo do usuário com a turma em cada leitura ou alteração; não confiar em `classId`, papel ou estado enviados pelo navegador.
5. O estudante consulta a atividade, abre instruções/anexos e marca sua própria tarefa como concluída. A conclusão nunca remove nem edita o prazo oficial.
6. O projeto prevê lembretes antes do vencimento, com antecedência de 24h e/ou 48h conforme preferência do usuário. Notificações push na web dependem de permissão do navegador, service worker e contexto seguro (HTTPS ou localhost); não devem ser apresentadas como garantia de entrega.
7. Ao alterar ou cancelar uma atividade, a API deve atualizar/cancelar lembretes ainda pendentes para evitar avisos com datas antigas.
8. Datas e horários são armazenados com fuso horário; a interface deve apresentar o fuso escolar configurado. O padrão local inicial é `America/Sao_Paulo`.

## Arquitetura da informação para web

- **Estudante:** visão geral → agenda → detalhe da atividade → checklist pessoal; notificações e acessibilidade ficam sempre acessíveis pela navegação.
- **Professor/coordenação:** visão geral da turma → atividades → criar/editar atividade → selecionar turma e disciplina → anexar material → publicar.
- Em telas largas, usar navegação lateral e conteúdo em colunas. Em telas estreitas, adaptar para navegação compacta e conteúdo em coluna única, sem esconder informações essenciais nem exigir rolagem horizontal.

Os rascunhos visuais atuais usam dados de demonstração. Roteamento, formulários de publicação, autenticação, acesso a arquivos, sincronização persistente e envio de push ainda precisam ser implementados.

## Identidade visual e acessibilidade

Paleta de referência do material do projeto:

| Uso | Cor |
| --- | --- |
| Roxo Noctua / ações principais | `#46479C` |
| Roxo suave / estados selecionados | `#8486DE` |
| Fundo lilás | `#CDCEFF` |
| Superfícies creme | `#F8F1E6` |
| Destaque amarelo | `#FFD38F` |
| Texto sobre tons quentes | `#715B38` |
| Grafite/lilás para texto | `#4B4C7E` |
| Marrom neutro | `#987B4C` |

Tipografia de referência: Poppins ou Inter; considerar OpenDyslexic como opção de acessibilidade em uma etapa posterior. O protótipo atual usa a pilha de fontes do sistema e oferece um controle funcional de alto contraste.

Diretrizes para implementação:

- Trabalhar com WCAG 2.1 AA como meta: contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande e componentes relevantes. Validar cada par real de cores antes de declarar conformidade.
- Manter texto legível a partir de 14px, formulários com rótulos explícitos, estrutura semântica, estados de foco visíveis e operação por teclado.
- Preservar alvos interativos de pelo menos 44×44px nos controles principais e não comunicar urgência apenas pela cor.
- Oferecer tema de alto contraste inspirado em azul noturno `#0B1F44`, amarelo `#FFD600`, creme claro `#FFFEEE`, grafite `#0A1A2F` e branco `#FFFFFF`. Validar o contraste das combinações antes de usá-las.
- Respeitar a preferência do sistema por movimento reduzido e evitar navegação excessivamente profunda.

## Contratos HTTP propostos

As rotas abaixo são propostas e ainda não implementadas. Todas ficam sob `/api`; atualmente somente `GET /api/health` está disponível.

### Conta e contexto

- `POST /auth/login` — autentica com e-mail e senha; retorna token e perfil público.
- `GET /auth/me` — retorna o usuário e os perfis/turmas aos quais tem acesso.

A criação de contas e a concessão de papéis devem ocorrer por um fluxo controlado pela instituição; não permitir que alguém escolha `teacher` ou `coordinator` no cadastro público.

### Agenda do estudante

- `GET /me/activities?from=&to=&type=&subjectId=` — atividades publicadas das turmas do estudante.
- `GET /activities/:activityId` — detalhe e anexos, após verificar o vínculo à turma.
- `PUT /activities/:activityId/checklist` — corpo: `{ "completed": true }`; atualiza apenas o checklist do usuário autenticado.
- `GET /me/notifications` — histórico de avisos destinados ao usuário.
- `POST /me/push-subscriptions` — registra uma assinatura push após consentimento do navegador.
- `DELETE /me/push-subscriptions/:subscriptionId` — remove uma assinatura revogada ou não utilizada.

### Publicação por professor/coordenação

- `GET /staff/classes` — turmas autorizadas para o usuário.
- `POST /activities` — cria rascunho ou publica atividade para uma turma/disciplina autorizada.
- `PATCH /activities/:activityId` — atualiza um rascunho ou uma atividade publicada autorizada.
- `POST /activities/:activityId/attachments` — associa um anexo depois do upload validado.
- `POST /activities/:activityId/cancel` — cancela uma atividade publicada após confirmação.

Uploads devem impor limites de tamanho e tipo e usar armazenamento de arquivos apropriado; os arquivos não devem ser gravados no diretório público do frontend.

## Modelo de dados inicial

As migrations PostgreSQL definem:

- `users`: estudantes, professores e coordenação.
- `academic_classes`, `subjects`, `class_memberships` e `class_subjects`: turmas, disciplinas, vínculos e responsáveis.
- `activities`: tarefas, provas, eventos e avisos, com rascunho, publicação e cancelamento.
- `activity_attachments`: metadados de anexos e referência segura a arquivos ou links externos.
- `student_activity_checklist`: conclusão privada por estudante e atividade.
- `notification_preferences`, `push_subscriptions` e `notification_deliveries`: preferências, inscrições e estado de cada lembrete.

As migrations na pasta `backend/database/migrations/` são a estrutura inicial do projeto e precisam ser aplicadas na ordem numérica em um banco novo. Elas ainda não incluem um runner de migrations nem foram aplicadas neste ambiente.

**Se você já aplicou as migrations anteriores de cursos/aulas deste scaffold, não execute esta nova sequência por cima do mesmo banco.** O esquema foi corrigido para o produto real antes do início do uso; uma base antiga precisa de uma migration de transição específica e backup, não de reaplicação das migrations iniciais.
