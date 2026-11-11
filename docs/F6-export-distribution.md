# F6 — Exportação e distribuição de apresentações

## Objetivo e fluxo
A F6 inicia a evolução P2 após F5. O professor continua **escrevendo/ditando → slides automáticos → ajustes opcionais → apresentar**. A nova ação **Exportar** permite distribuir uma cópia da apresentação em HTML e gerar PDF pela função de impressão do navegador, sem dependência de serviços pagos.

## Entregas
- Botão **Exportar** na aula para professores autorizados.
- Prévia de todas as páginas em 16:9, usando a mesma origem de conteúdo (`parseSlides`), templates normalizados e overrides de geometria do editor F4.
- **Baixar HTML**: arquivo `.html` estático, com CSS interno, sem JavaScript e sem credenciais de Supabase. Pode abrir localmente; textos e estilos funcionam sem conexão.
- **Imprimir / PDF**: usa `window.print()`. Escolher **Salvar como PDF** no navegador. A impressão coloca um slide em cada página, com `@page` 16:9, fundo/color printing, rodapé opcional e ajustes de posição.
- O exportador recebe somente texto visível (`slide.markdown`), estilo e geometria. **Não recebe nem serializa** `slide.answer` nem `speaker_notes`.
- Nomes de arquivo gerados com slug seguro a partir do título, sem caminhos ou caracteres não portáteis.
- Alertas: imagens externas continuam sendo links e **precisam de internet para aparecer no HTML salvo**; blocos Mermaid são exportados como código, não SVG. Isto também se aplica à versão PDF quando houver código Mermaid.
- Não requer tabela nova nem alteração do Supabase.

## Segurança
1. `buildExportPlan` forma um objeto restrito de páginas, não propaga campos desconhecidos de `Slide`/aula.
2. A marca, o tema e os URLs de fundo são normalizados pelos utilitários existentes. O Markdown é convertido em HTML pelo `react-markdown` sem `rehype-raw`, evitando executar HTML do conteúdo.
3. Documento baixado contém **Content Security Policy** restritiva: bloqueia scripts, formulários e recursos remotos exceto imagens por HTTPS; CSS embutido.
4. O botão de exportação é habilitado apenas a professores com `canEdit` (já verificado no app); não é um endpoint de compartilhamento público.
5. Respostas que estejam no **corpo normal** da aula, fora de diretivas `:::answer`, continuarão visíveis e serão exportadas. A F6 não substitui RLS nem isolamento de dados de gabarito no servidor.
6. Não é promessa de arquivo plenamente offline para imagens ou diagramas; não se tenta incorporar arquivos de terceiros sem permissão.

## Testes
- `tests/f6-export-model.test.mjs`: privacidade, nome de arquivo, geometria, tema e alertas de conteúdo externo.
- `tests/e2e/export.spec.ts`: geração e download do HTML, ausência de notas/gabarito, posição salva, chamada da impressão e acesso ao botão por papel.
- A CI existente do PR F5 continua com `npm test`, `npm run build`, `npm run skills:check`, `npm run test:e2e` em desktop e mobile.

## Validação manual exigida
- Exportar 1/2/20 slides com capas, listas, exercício, imagens e templates.
- Conferir impressão em Chrome, Firefox e Edge: 16:9, página individual, sem corte de títulos, bordas ou paginação.
- Verificar sobreposição de blocos fixos, textos compridos e quebras; corrigir na aula antes de exportar.
- Testar reabrir HTML offline e com internet para checar referências de imagem.
- Testar conta de professor, outro professor e aluno real (autenticação/RLS), não apenas a fixture de QA.

## Rollout e dependências
Esta F6 parte da branch F5/PR #8, que depende de F4/PR #7 e da migration `20261111_hybrid_slide_editor.sql`. Integrar na ordem **F4 → aplicar SQL F4 → F5 → F6**. Não fazer deploy automático enquanto o banco/QA dos papéis reais não estiver concluído.

## Próximas evoluções fora do escopo
Exportação PPTX editável, converter Mermaid para SVG antes de exportar, imagens incorporadas no HTML, links públicos com controle de acesso, colaboração em tempo real e versões de aula. Esses itens precisam de fase/issue próprios.
