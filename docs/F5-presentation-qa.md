# F5 — Apresentação, acessibilidade, responsividade e testes E2E

## Objetivo
Concluir a usabilidade de projeção do SlideHub sem deslocar a escrita/ditado do papel principal. O professor continua escrevendo/ditando, o sistema gera os slides automaticamente e o ajuste visual por arrastar permanece **opcional**.

## Melhorias no apresentador
- Navegação por teclado: **←/→/↑/↓**, **Espaço**, **PageUp/PageDown**, **Home/End**. Atalhos **O** (índice de slides), **? / H** (ajuda), **F** (tela cheia) e **Esc** (fechar o painel atual/apresentação).
- Índice de slides acessível, navegável por clique e teclado, com rótulos derivados do título visível de cada slide (nunca do gabarito).
- Ajuda de atalhos consultável durante a projeção.
- Diálogo modal mantém o foco por teclado dentro da apresentação e o devolve ao elemento que a abriu ao fechar.
- Notas e gabarito com controles de professor. **A interface do aluno não exibe o botão de revelar respostas.** Isso não substitui a necessidade de isolamento real de respostas no servidor; o Markdown publicado atualmente ainda pode conter a diretiva de gabarito e seus dados devem ser considerados acessíveis ao usuário que recebeu esse Markdown.
- Preview, layout salvo pela F4 e templates da F3 continuam com as mesmas regras.

## UI e acessibilidade
- Cabeçalho e botões compactos em dispositivos móveis; índice com rolagem horizontal interna, sem ampliar a viewport.
- Conteúdo da apresentação com limites de imagem/tabela/bloco de código, rolagem vertical quando necessário, coluna única em telas menores.
- Modo professor muda para painel de notas empilhado no mobile.
- Indicadores de progresso e foco visível. Ajustes de animação seguem a preferência `prefers-reduced-motion`.
- Biblioteca de templates aberta como modal acessível: **Esc** fecha, **Tab** permanece dentro e foco retorna ao botão de origem.
- **Sem redimensionar ou deslocar automaticamente blocos fixados:** o professor controla suas escolhas e os avisos de overflow continuam na F4.

## Testes automatizados
- Unitários: `npm test`, incluindo atalhos e limites de navegação.
- Compilação: `npm run build`.
- E2E Chromium desktop 1440×900 e mobile 390×844: `npm run test:e2e`.
- A fixture `tests/e2e/presenter.html` monta uma aula de teste in-memory. **Não utiliza Supabase nem autenticação real**. Verifica fluxo de apresentação, transições, índice, atalhos, foco, gabarito/controles somente na UI, geometria fixa e viewport.
- GitHub Actions CI tem job `e2e` separado e registra evidências quando falhar.
- Playwright é dependência de desenvolvimento: `@playwright/test` (não entra no bundle publicado). Instalação local: `npm install`; `Google Chrome instalado no sistema (canal chrome)`.

## Riscos e validação manual obrigatória antes de publicar
1. **F4 precisa estar concluída e SQL F4 aplicado** ao Supabase antes de publicar o app que usa `lessons.editor_layout`, `lessons.editor_revision` e `speaker_notes.slide_key`. A F5 não aplica migrações.
2. Testar autenticado com **professor dono, segundo professor e aluno**, verificando aulas publicadas/não publicadas e RLS (não coberto pela fixture).
3. Em cada papel, testar salvar Markdown, notas, drag opcional, persistência de layout após recarregar, gabarito, templates F2/F3 e publicação.
4. Em navegadores reais, verificar microfone, navegador sem reconhecimento de voz, tecla Escape, foco em modais, fullscreen e projetor.
5. Verificar contraste e legibilidade real em 320px, 375px, 768px, 1366px, 1920px e projetores 16:9.
6. **Segurança de gabaritos:** dados de respostas devem migrar para recurso protegido por RLS se o objetivo for segredo real dos alunos. Ocultar o botão é apenas uma barreira visual, não uma garantia de confidencialidade.
7. Exportações de apresentações para PPTX/PDF e colaboração em tempo real não fazem parte desta fase.

## Integração
- Branch `feat/f5-presenter-accessibility-e2e` parte da F4, PR #7, e deve ser integrada **depois** dela.
- Não fazer merge/publicar F5 antes da migração F4, CI aprovada, validação E2E e inspeção manual de fluxo real.


**CI F5:** os testes E2E usam o canal `chrome` já disponível no runner Ubuntu 24.04, evitando downloads custosos de Chromium em toda execução. Os testes também podem ser executados no computador local com o Chrome instalado.
