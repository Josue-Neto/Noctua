# Auditoria de implementação e interface

## Complemento de 23/11/2026 — lembretes Web Push

As quatro suítes de integração passaram no PostgreSQL isolado, incluindo preferências de 24/48 horas, remarcação, cancelamento, remoção de vínculo, isolamento de inscrições e envio com transporte simulado. Na interface de estudante, o botão de ativação e as opções de antecedência foram inspecionados; a alteração de 24 horas permaneceu salva após recarregar. Não foi concedida permissão de notificações ao navegador e a entrega real por um serviço Web Push externo não foi verificada. As inscrições exigem HTTPS ou localhost e consentimento explícito do navegador.

## Complemento de 19/11/2026 — publicação

A API rejeita a mudança de uma atividade publicada de volta para rascunho. A edição de rascunho oferece ações explícitas para salvar ou publicar; a edição de atividade publicada oferece salvar alterações. No navegador, um professor de teste salvou um rascunho na turma autorizada, publicou e confirmou as opções de edição. As três suítes de integração passaram, incluindo bloqueio por turma, rascunho oculto de estudantes e rejeição da volta a rascunho. Os dados de teste foram removidos.

## Complemento de 19/11/2026 — agenda e detalhes

Adicionada a rota autenticada `/atividades/:id`, acessível pelo título dos cards. A tela consulta `GET /api/activities/:id` e mostra turma, disciplina, autor, prazo no fuso escolar, orientações e links dos materiais. O checklist usa o mesmo `PUT` individual da agenda e da lista de tarefas. Um link direto preserva o destino durante o login.

Verificado no navegador com API, frontend e PostgreSQL isolados: link direto → login → detalhes; card da lista → detalhes; marcar conclusão → recarregar → marcação preservada; desmarcar; e erro de atividade indisponível sem reaproveitar dados em cache. Build do frontend aprovado. As três suítes de integração passaram, agora com verificações explícitas de listagem apenas publicada e conclusões independentes entre estudantes da mesma turma. Os dados sintéticos foram removidos após a auditoria.

Data: 18/11/2026. Ambiente: aplicação local em `localhost:5173`, API NestJS e PostgreSQL 18. Dados sintéticos em banco separado; banco ativo `noctua` preservado.

## Resultado automatizado

- Backend: build aprovado e 10 testes unitários aprovados.
- Frontend: build aprovado e 3 testes de conversão de datas aprovados, incluindo virada de dia e horário inexistente em mudança de horário de verão.
- PostgreSQL e HTTP: 3 suítes de integração aprovadas, com persistência, isolamento, sessões, CSRF, validação de DTOs e permissões.
- Migrations `001` a `009`: aplicadas em bases novas; reexecução confirmou histórico inalterado. Checksum detecta edição de migration aplicada; cada arquivo é executado em transação.

As suítes reais cobrem duas turmas, estudantes distintos, professor e coordenação; publicações e rascunhos; tentativa de acesso por ID de outra turma; autoria preservada; checklist individual; rollback de vínculos inválidos; bloqueio após remoção de vínculo; perfil e preferências; URLs inválidas; convite de professor, revogado, expirado e reutilizado; recuperação de senha com token de uso único; login e logout por HTTP; bloqueio da gestão para estudantes e professores.

## Fluxos verificados no navegador

| Fluxo | Verificação observada |
| --- | --- |
| Login | Credencial incorreta recebe erro; professor, estudante e coordenação entram com seus dados próprios. |
| Logout e acesso protegido | Sair retorna ao login; estudante é redirecionado ao tentar abrir a gestão. |
| Atividades | Professor cria rascunho com link HTTPS; rascunho permanece após recarregar; publicação aparece para estudante autorizado. |
| Agenda | Seletores de dia, semana, mês, turma, disciplina e tipo; nomes acessíveis nas datas; link do material disponível. |
| Cancelamento | Desistir preserva atividade; confirmar cancela e retira a atividade da agenda ativa. |
| Isolamento | Estudante da turma B não vê publicação da turma A. |
| Checklist | Conclusão atualiza os contadores e permanece marcada após recarregar. |
| Perfil | Nome e biografia salvos; nome atualizado continua após recarga. E-mail, instituição e turma não podem ser alterados pelo usuário. |
| Preferências | Tema escuro e fonte OpenDyslexic permanecem após recarregar. |
| Vínculos | Coordenação seleciona estudante existente e salva nova associação de turma. |
| Convites | Criação gera convite pendente; confirmação na página revoga; link encerrado mostra erro orientando solicitar novo convite. |
| Recuperação | Solicitação exibe resposta genérica sem revelar a existência da conta. A confirmação válida e uso único foram testados na integração com PostgreSQL. |
| Indisponibilidade | API desligada produz estado de erro com botão de tentar novamente; ao restaurar, o acesso volta ao login. Nenhum dado demonstrativo é exibido como substituto. |
| Responsividade | Gestão inspecionada em tela estreita e desktop; largura do conteúdo ficou igual à largura disponível após a correção do seletor. |
| Acessibilidade | Rótulos, foco inicial/restauração e contenção de Tab nos diálogos; retorno sem confirmar; preferências de fonte e tema; widget VLibras presente. Não constitui certificação WCAG. |

## Problemas encontrados e corrigidos

- Retorno de `UPDATE ... RETURNING` do TypeORM interpretado como linhas simples. Corrigido em edição de atividades, atribuição de professor por convite e revogação; os testes reais confirmam a gravação.
- Conteúdo temporariamente vazio durante o carregamento. A interface agora aguarda os dados e apresenta estado de carregamento.
- Confirmação nativa bloqueando automação e navegação. Substituída por diálogo na página com foco, teclado e possibilidade de desistir.
- Seletor de usuários causando rolagem horizontal em tela estreita. Corrigidos limites de largura dos campos.
- Respostas antigas de requisições após troca de sessão. O contexto descarta resultados de uma sessão anterior e limpa os dados no logout ou em `401`.

## Limites e situação da entrega

O envio real por SMTP não foi auditado: em desenvolvimento sem SMTP, os links ficam nos logs locais. Não há envio automático de notificações nem upload de arquivos nesta etapa; materiais e fotos usam links HTTPS. A aceitação de convite e a redefinição de senha foram verificadas no backend com PostgreSQL real; na interface foram inspecionados os formulários e os estados de erro/solicitação, sem alterar credenciais pessoais.

O Supabase contém o esquema privado preparado. O advisor retornou apenas informação de RLS habilitado sem políticas, coerente com tabelas não expostas e acesso exclusivo pelo backend proprietário do schema; veja a [explicação do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). A aplicação usa PostgreSQL local por decisão do usuário.

O remoto GitHub está configurado; a conta conectada não tem permissão de push. Não houve envio de código nem associação administrativa do repositório ao Supabase. As contas e atividades de auditoria foram removidas; a base local ativa conserva apenas a coordenação inicial e está pronta para cadastro real de turmas.
