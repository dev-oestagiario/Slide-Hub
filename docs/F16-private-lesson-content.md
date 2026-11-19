# F16 — Proteção do conteúdo privado das aulas

## Projeto técnico
O backend mantém a fonte completa e o layout original para o proprietário da disciplina. A política SELECT de lessons passa a permitir somente proprietários; uma política restritiva impede que outra política permissiva reabra a leitura direta. INSERT/UPDATE/DELETE exigem dono e papel teacher/admin da tabela profiles. Notas e blocos internos continuam com RLS de proprietário.

A RPC list_accessible_lessons() exige auth.uid(), não recebe identidade/role do cliente, tem search_path vazio e grants explícitos. Proprietários recebem as linhas completas. Outros usuários autenticados (inclusive outros professores) recebem apenas aulas publicadas de disciplinas públicas. A projeção remove trechos :::answer inclusive malformados/sem fechamento e cercas de código dentro da resposta; mantém exemplos de sintaxe dentro de cercas públicas. O layout é filtrado: só blocos com texto encontrado literalmente na fonte pública; campos desconhecidos, overrides órfãos e propriedades fora da allowlist não são retornados. Geometria, estilos e animações públicos válidos são preservados. O cliente reconcilia o restante do layout usando a fonte pública.
Não há fallback para SELECT *; a troca de conta limpa o estado e aguarda dados da conta nova.

## Verificação
O job security-sql executa todas as migrations na ordem lógica em PostgreSQL 16 descartável com auth/storage mínimos e papéis simulados. Cenários: aluno e professor não proprietário, rascunho, disciplina privada, notas, leitura direta mesmo com política permissiva extra, layout contaminado, gabarito com fence e sem fechamento, escrita negada, proprietário, revisão otimista, grants de anônimo/auxiliares. A transação de teste é revertida. CI React/Playwright continua. Isso não é teste autenticado do Supabase real nem teste de PostgREST.

## Gate de implantação
- **Banco real indisponível** nesta etapa; nenhuma migration aplicada. Não mesclar/publicar enquanto não validar schema, grants, views, RPCs e políticas reais (incluindo eventuais políticas extras de escrita e canais Realtime).
- A migração é aditiva em funções mas altera a leitura da tabela. Clientes antigos de alunos deixam de listar aulas públicas após a mudança do RLS; preparar em staging, coordenar alteração de banco + deploy no mesmo intervalo, invalidar caches antigos. Não restaurar o SELECT amplo por rollback: isso reabriria a exposição. Backups e revisão antes de aplicar. Atualização de schema não altera conteúdo das aulas nem suas revisões.
- Conferir as migrations históricas duplicadas no repositório com o histórico real; aplicar apenas a nova migration por mecanismo controlado, sem executar novamente as antigas. Não renomeamos histórico existente sem conferência.
- Em staging/Supabase, com contas distintas, conferir RPC via REST, SELECT direto, anexos, notas, rascunhos, layout, animações, autosave, conflitos e troca de usuário. Confirmar também que não existem views/RPCs alternativas que exponham a linha original.
- Imagens do bucket público permanecem públicas por design; não guardar ali imagens destinadas a gabaritos privados. O filtro não adivinha segredos escritos como texto público, em títulos ou em branding/temas. Não pretende revogar conteúdo já recebido por clientes antes da migração.
- PRs #10–#18 + F16 precisam de homologação integrada; nenhuma publicação automática nesta fase.
