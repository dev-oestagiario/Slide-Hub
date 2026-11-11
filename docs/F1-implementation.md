# F1 — arquitetura frontend e redesign do shell

## Base
Esta implementação da F1 é criada **sobre a branch da F0** (`feat/f0-quality-baseline`). A F0 permanece como PR #3 separado. O PR da F1 é cumulativo até o merge da F0 e não faz migrações Supabase.

## Experiência implementada
- **Home de professor e aluno** com boas-vindas, contadores, aulas recentes, disciplinas, estados vazios e ações reais.
- **Navegação modular**: sidebar com disciplinas/módulos/aulas, breadcrumbs com botões acessíveis e navegação móvel com backdrop.
- **Espaço de edição text-first**: título, indicador do estado de salvamento, botões de conteúdo, ditado com indicação de atividade, prévia dos slides e notas privadas recolhíveis.
- **Estilo profissional**: tokens CSS neutros, superfícies brancas, bordas discretas, verde-petróleo apenas em ações, componentes com foco visível e layout responsivo (320+ px).
- **Composição por funcionalidade**: a montagem da UI foi extraída de `App.tsx` para `features/dashboard`, `features/navigation`, `features/courses`, `features/lessons` e compartilhamento de tipos.
- **Sem mudança de paradigma**: a escrita/voz continua sendo o caminho principal. **Arrastar elementos permanece fora da F1**, previsto para F4, e será opcional.

## Estrutura de arquivos
```
src/
  features/
    courses/
      types.ts             # entidades existentes do Supabase
      selectors.ts         # mapeamento seguro de aulas recentes e estatísticas
      CourseOverview.tsx   # disciplina e módulo
    dashboard/
      Dashboard.tsx
    navigation/
      AppSidebar.tsx
      AppTopbar.tsx
    lessons/
      LessonWorkspace.tsx  # editor texto/voz, prévia, notas
  styles/
    f1.css                 # tokens, UI, estados, responsividade
  App.tsx                  # estado de sessão + operações Supabase + composição
```

## Integridade e compatibilidade
- Preserva `lessons.markdown`, modos `edit/article`, parser, upload Supabase, exercícios, gabaritos, templates/temas existentes e modo apresentação.
- A nova UI usa os *mesmos callbacks* de escrita, salvar, publicar, notas, criar entidades, abrir o ThemeStudio e apresentar.
- Os avisos F0 de alterações não salvas continuam operacionais ao navegar; trocar de módulo/aula usa callbacks de `App.tsx`.
- Nenhuma exclusão de tabela, alteração de política RLS ou instalação de biblioteca extra.
- Os contadores e aulas recentes são calculados a partir das linhas já retornadas com RLS, sem consultas adicionais por card.
- Testes `tests/f1-dashboard.test.mjs` cobrem filtragem de vínculos ausentes, ordenação e estados vazios.

## Limitações ainda intencionais
- Operações Supabase permanecem em `App.tsx`: extração gradual por feature e adoção do TanStack Query acontecem quando a arquitetura de dados for alterada; evitar reescrita em lote arriscada.
- Fluxo de Templates completos pertence à F2/F3; “Aparência” nesta fase reaproveita o ThemeStudio.
- Ajuste manual de posição no slide e geometria persistente pertencem à F4.
- Salvamento é manual (com proteção de rascunho da F0), autosave e reconciliador de blocos estáveis na F4.
- A responsividade foi implementada em CSS, **mas aprovação visual e testes autenticados E2E precisam de execução em navegador** (plano `docs/F0-manual-test-plan.md`).
- Sem pacote de roteamento adicional neste PR. A navegação entre entidades continua via callbacks; URLs profundas exigem tratamento para o GitHub Pages e serão adicionadas em uma etapa controlada.

## Critérios de aceite
- CI: `npm test`, `npm run build`, `npm run skills:check`.
- Professor/aluno veem apenas ações permitidas pela interface; políticas RLS anteriores permanecem.
- Criação e edição de aulas continuam possíveis pelo texto, com prévia automática e apresentação em tela cheia.
- Navegação em telas de 320px, 375px, 768px, 1366px e acima sem esconder funções (verificação manual pendente).
- Código organizado e estilização aplicada sem alterar o conteúdo das aulas.
