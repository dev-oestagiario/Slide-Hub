# F0 — auditoria técnica e qualidade do SlideHub

Data: 11/11/2026 · Escopo: `main` no commit `8af76b1972de03ff5c84414de4840343cdb45095`. Demandas: issue #1. **Não é o redesign**.

## Objetivo
Construir a base de qualidade para o SlideHub **híbrido**: digitar/ditar conteúdo e gerar slides automaticamente; ajustes de posição por arrastar são opcionais, persistentes e editáveis na prévia. Preservar dados de professores e alunos em toda migração.

## Achados e ações verificáveis

| ID | Prioridade | Evidência e risco | Resultado nesta F0 | Próxima ação |
| --- | --- | --- | --- | --- |
| F0-01 | P0 | `src/lib/slideParser.ts`: `##` ou `<!-- slide -->` dentro de `:::answer` podia originar slide público. A apostila removia gabarito com regex frágil. | Corrigido parser e apostila derivada do parser; testes de gabarito aberto, fechado e dentro de fences. | E2E com usuário aluno autenticado. |
| F0-02 | P0 | `src/App.tsx`: botão Salvar manual e navegação que descarta título/Markdown alterados sem aviso. | Aviso antes de sair, mudar aula ou fazer logout; `beforeunload` para refresh/fechar aba; comparação pura e testes. | Autosave com fila serializada, versão de escrita e recuperação local na F4. |
| F0-03 | P0 | `src/lib/slideParser.ts` identifica slides por índice (`id:number`); `speaker_notes.slide_index` guarda índice. Ao inserir/remover slide, notas podem migrar para outro assunto. | Identificado e documentado; **nenhuma migração arriscada aplicada**. | F4: IDs estáveis de slides/blocos com backfill e referência cruzada. |
| F0-04 | P0 | Sem modelo de geometria de blocos; qualquer layout manual seria perdido ao interpretar Markdown de novo. | Contrato de IDs, base 16:9 e precedência de overrides documentado em `docs/F0-migration-plan.md`. | F4: `lesson_layout_overrides` aditiva com RLS, autosave e teste de persistência. |
| F0-05 | P1 | `slide_templates.config` guarda apenas aparência, e aplicar tema limpa `template_id`. | Separação domínio tema/template definida; dados existentes preservados. | F2/F3: biblioteca e modelos versionados, snapshot por aula. |
| F0-06 | P1 | `src/App.tsx` une Auth, CRUD, notas, editor, mídia e apresentação em um componente. | Mapa de responsabilidades e plano de extração por feature. | F1: extrair hooks, stores e serviços incrementais. |
| F0-07 | P1 | Há CSS responsivo para 1100/740 px e ThemeStudio 980/620 px, mas visual/teclado/leitores de tela ainda não foram inspecionados em navegador real. `.mini-slide` e `.slide-body` dependem de rolagem para conteúdo extenso. | Cenários manuais de UX/a11y registrados. | F1/F5: Playwright, axe, mobile 320/375/768/1366/1920, overflow real e redução de movimento. |
| F0-08 | P1 | `npm install` sem lockfile fixado no GitHub; testes de browser/RTL não configurados. | Testes Node para os contratos essenciais e CI existente aproveitado. | Introduzir lockfile, Vitest/RTL e Playwright por etapas. |
| F0-09 | P1 | Proteções Supabase inspecionadas **somente por consultas de leitura**, não como usuário aluno real. | Todas as 7 tabelas `profiles`, `disciplines`, `modules`, `lessons`, `speaker_notes`, `slide_templates`, `lesson_blocks` constam com RLS ativa no banco Dev. | Validar políticas por papéis autenticados em ambiente de testes antes de novas migrations. |
| F0-10 | P2 | Supabase Security Advisor: *Leaked Password Protection Disabled*. Performance Advisor: índice ausente em `lessons.template_id`; um índice sem uso medido (`lessons_module_position_idx`). | Achados registrados; sem alteração de banco nesta etapa. | Habilitar proteção de senhas no dashboard; adicionar índice em migration aditiva; **não remover índice sem estatística representativa**. |
| F0-11 | P1 | Bucket `slide-theme-backgrounds` está público com limite 3 MB, controlando uploads por owner. | Política e configuração catalogadas. | F2/F4: distinguir mídias públicas de recursos privados, validar privacidade, exclusão e limpeza de imagens órfãs. |

Fonte externa da recomendação de senha: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
Aviso de índice: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

### Escopo auditado
- `src/App.tsx`, `src/lib/slideParser.ts`, `src/lib/slideThemes.ts`, `src/components/ThemeStudio.tsx`, `src/components/Presentation.tsx`, CSS principal, scripts de testes e workflows.
- Migrations `supabase/migrations/20261110_educational_studio.sql`, `20261110_theme_studio.sql`.
- Supabase Dev: metadados de colunas, presença de RLS, bucket de fundos, lints de segurança e desempenho. **Nenhum dado de usuário ou credencial exportado**.

## Riscos residuais e limites honestos
- O aviso de saída **não é autosave**; se o navegador travar ou o dispositivo desligar sem recarga normal, alterações não salvas ainda podem ser perdidas.
- A confidencialidade do gabarito no frontend foi protegida para tokens especiais; isso não substitui autorização no servidor para conteúdo sensível. As aulas publicadas ainda transportam o Markdown original ao navegador, incluindo gabaritos. **Uma ocultação visual não é segredo criptográfico**; solução futura: separar gabaritos da resposta pública no servidor/RLS, quando necessário.
- O atual parser ainda não infere quebras por densidade e não dispõe de blocos estáveis. A F0 não promete persistência de posições.
- A verificação de RLS em metadados não prova que todas as condições de política funcionam para todos os papéis; exigir teste dinâmico autenticado antes de declarar segurança completa.
- Testes e build em CI não substituem auditoria real de responsividade nem testes E2E com autenticação.

## Gates para aceitar a F0
1. `npm test` verde cobrindo testes atuais e novos casos de privacidade, Markdown e rascunho.
2. `npm run build` verde (TypeScript/Vite).
3. `npm run skills:check` verde; sem instalação de packages externas na CI.
4. PR independente sem migrations nem exclusão/alteração de dados no Supabase; `main` e Pages permanecem estáveis até revisão.
5. Planos de IDs estáveis, notas, templates e layout persistente descritos e vinculados à issue #1.

**Após F0:** iniciar F1 (arquitetura e navegação), mantendo text-first e modo visual opcional como contrato de produto.
