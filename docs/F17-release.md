# F17 — Homologação final e publicação

## Candidato único
A ponta F16 inclui todos os PRs #10–#19 em sequência de ancestrais, sem divergência da main. Em vez de disparar deploys de versões intermediárias, integrar a ponta homologada em um único merge. O GitHub fechará PRs cujos commits forem incluídos; verificar o estado de cada PR depois. Não fazer squash da pilha.

## Testes
CI F16 44510706714: SQL, unitários, build, skills e Playwright aprovados. F17 adiciona PostgREST real sobre PostgreSQL descartável, JWTs sintéticos e os papéis autenticado/anônimo; verifica a RPC e a tabela pela interface HTTP, notas, gabarito, gravação e conflito de revisão. Não é login no Auth real do Supabase.

## Sequência de publicação
1. Confirmar Supabase ACTIVE_HEALTHY; verificar contagem, schema, políticas, grants, views, funções expostas e histórico de migrations. Se houver drift, parar.
2. Executar a nova migration e os testes de isolamento com rollback em ambiente controlado; preservar dados existentes. Nenhuma reaplicação das migrations antigas com prefixos duplicados.
3. Com release CI verde, coordenar ativação de RLS e merge único/deploy da ponta. Clientes antigos de aluno deixam de listar aulas até receber a nova versão; não restaurar acesso raw como rollback.
4. Validar CI e Pages do commit de main. Smoke com professor e aluno reais, checar REST/RLS, salvamento e conflito, recuperação de rascunho, notas, imagens, apresentação/exportação, troca de conta. Não armazenar credenciais em código.
5. Se banco indisponível ou CI falhar, manter main e schema inalterados.

O projeto estava INACTIVE; a solicitação de restauração foi aceita durante a F17. Aguardar confirmação ACTIVE_HEALTHY antes de qualquer SQL. A mídia em buckets públicos não é protegida pela projeção.
