# Banco e execução local

O banco ativo é PostgreSQL local, conforme a decisão do usuário. A API usa `backend/.env`, ignorado pelo Git. A base `noctua` possui uma conta inicial da coordenação; as credenciais locais estão em `.local-test/primeiro-acesso.txt`, também ignorado.

## Iniciar

Na raiz do projeto, execute `backend/scripts/local-test-db.ps1` para iniciar o cluster PostgreSQL local na porta `55432`. O nome histórico do script indica a origem do cluster; ele contém duas bases separadas: `noctua`, usada pela aplicação, e `postgres`, reservada às fixtures dos testes. Não remova `.local-test/postgres`: esse diretório contém os dados locais. Para backup, use `pg_dump` antes de copiar ou remover o cluster.

Dentro de `backend`, execute `npm run migrate` e `npm run start:dev`. Dentro de `frontend`, execute `npm run dev`. O frontend é acessível em `http://localhost:5173`, com API em `http://localhost:3000/api`.

As migrations usam o schema privado `noctua`, histórico com checksum, lock contra concorrência e transação por arquivo. A reexecução aplica somente arquivos pendentes. Não edite uma migration já aplicada: acrescente outra. `synchronize` permanece desativado. O provisionamento interativo da primeira coordenação está disponível por `npm run bootstrap:coordinator` para novas instalações.

## Testes

- `backend`: `npm run build` e `npm test`.
- `frontend`: `npm run build` e `npm test`.
- Integração com PostgreSQL real: `backend/scripts/run-local-test.ps1 integration` após compilar o backend e iniciar o cluster local.
- Auditoria da interface: `backend/scripts/run-local-test.ps1 fixtures`, depois `backend/scripts/run-local-test.ps1 api`, e o Vite. Use somente as contas sintéticas de `.local-test/audit-accounts.json`. A limpeza é `backend/scripts/run-local-test.ps1 clean`.

As fixtures ficam na base `postgres`, não na base ativa `noctua`. Os testes de integração removem seus próprios dados. Os testes exigem conexão local disponível; não devem ser apontados ao projeto hospedado.

## Supabase preparado para conexão futura

Projeto: `Noctua`, ref `umiimjpkfnmuwsrwqahh`, região `sa-east-1`, organização escolhida pelo usuário. As migrations `001` a `009` e o histórico já foram aplicados no schema privado. As tabelas não são expostas à Data API. Nenhum dado demonstrativo foi importado.

O usuário optou por manter o PostgreSQL local até obter acesso ao GitHub e configurar a associação com o Supabase. A cópia da configuração remota está em `.local-test/supabase.env`, ignorada pelo Git. Para ativação futura, obter o host exato em **Connect → Session pooler**, usar o usuário de banco dedicado com o sufixo do projeto indicado pelo painel, configurar o certificado CA quando necessário e validar TLS. O host direto do projeto só retornou IPv6, sem rota disponível neste computador. Não desabilitar a verificação do certificado.

O frontend continua acessando exclusivamente o NestJS. Não precisa de chave Supabase nem de credenciais PostgreSQL. O executor, a API e o bootstrap usam `search_path=noctua,pg_catalog`.

## GitHub

O remoto `origin` já aponta para `https://github.com/Josue-Neto/Noctua.git`. A conta pessoal conectada retornou `push: false`; envio de commits e associação administrativa ao Supabase dependem da concessão de acesso pelo proprietário. Nenhuma alteração foi enviada.

## Preferências e anexos

Anexos e foto de perfil usam links HTTPS. O serviço não baixa esses endereços; o conteúdo permanece no serviço externo. Perfil, tema, fonte, contraste e preferências de antecedência são persistidos no banco. O envio de lembretes é uma etapa futura. Convites e recuperação usam SMTP; sem SMTP em desenvolvimento, os links aparecem somente no log local da API.
