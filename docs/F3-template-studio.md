# F3 — Estúdio avançado de templates

**Branch:** `feat/f3-template-studio` (sobre F2 / PR #5). **Objetivo:** permitir ao professor compor a identidade visual e as regras de distribuição de conteúdo sem escrever JSON nem montar slides manualmente.

## Novidades implementadas
- Construtor guiado em **três etapas**: (1) aparência, (2) composição automática e (3) identidade visual.
- Configuração independente para **oito tipos de slide**: capa, conteúdo, lista, citação, imagem, comparação, exercício e encerramento.
- Opções de layout existentes (texto, centralizado, duas colunas), densidade do conteúdo (mais espaço, equilíbrio, compacto), fontes e fundos.
- Cabeçalho opcional com nome institucional, logo com posição à esquerda ou direita, faixa de cor e rodapé com texto/número do slide.
- Fundo exclusivo da capa com opacidade de sobreposição. O fundo global continua válido para todos os outros slides.
- Prévia de amostra selecionável para cada tipo de slide usando Markdown e renderização compartilhada de cabeçalho/rodapé.
- Aplicação das mesmas regras na prévia real da aula e na apresentação completa, com elemento compartilhado `TemplateChrome`.
- Modelo JSON **v2** validado/normalizado; compatibilidade de leitura com snapshots e templates da F2 `schemaVersion:1`.
- Sem nova migration: a coluna `presentation_templates.config` e o snapshot em `lessons`, criados pela F2, já são `jsonb`. **A migration F2 precisa estar aplicada** antes de usar templates salvos no Supabase.

## Regras de composição
Em `src/features/templates/model.ts`:
1. Um slide marcado como exercício recebe o layout de exercício.
2. Slide com título de encerramento recebe o layout de encerramento.
3. O primeiro slide recebe o layout de capa.
4. Slides com imagem, tabela, citação ou lista são identificados por estruturas Markdown (nessa ordem) e recebem suas regras específicas.
5. Os demais recebem o layout de conteúdo.
6. Uma diretiva manual `<!-- slide: layout=... -->` explícita tem prioridade sobre o layout do template.
7. **Nenhuma regra modifica Markdown, gabaritos, notas, IDs ou ordem dos slides.** O novo visual é derivado no momento da apresentação.

Observação: a identificação é determinística e baseada em padrões, **não IA**. Um conteúdo misto pode cair na categoria menos especializada; o professor poderá escolher diretamente um layout no texto, sem arrastar elementos.

## Segurança e privacidade
- Marca, logo e imagens de capa passam pelo mesmo normalizador que valida os URLs do bucket Supabase de imagens; links perigosos ou inválidos são descartados.
- Títulos e rótulos de marca são limitados em tamanho; tipos e densidades inválidos usam valores seguros.
- O bucket de fundo existente é **público**; imagens enviadas para templates são acessíveis por URL e não devem conter informações privadas.
- CRUD e RLS de proprietário da F2 permanecem inalterados; a F3 não solicita service role no navegador.

## Limites deliberados / F4
- O professor **não precisa arrastar nada** para criar/aplicar templates.
- Ajustes manuais por arrastar, redimensionamento e salvamento de posições individuais continuam na F4, com IDs persistentes por bloco.
- A prévia utiliza dados de demonstração dos oito tipos, não documentos de usuário como entrada livre; a prévia real da aula usa o próprio Markdown.
- Conteúdo extenso ainda pode exceder a área de apresentação. Detecção de overflow, avisos e divisão assistida serão abordados na F4/F5.
- Não foram realizados testes autenticados no navegador nem aplicação da migration da F2 neste PR.

## Gates para integração
1. Integrar, nesta ordem, PR #3 (F0), PR #4 (F1), PR #5 (F2) e PR #6 (F3). PR #2 de skills é independente.
2. `npm test`, `npm run build` e `npm run skills:check` devem passar na CI.
3. Executar migration F2 no Supabase Dev após revisar permissões e realizar backup; testar autenticação de professores diferentes e conta aluno.
4. Exercitar em navegador: criar/editar/duplicar template, fazer upload de logo/fundo, escolher modelos, aplicar na aula, revisar preview/presentação em tela grande e celular.
5. Só depois publicar no GitHub Pages.

**Produto:** professor escreve/dita, o SlideHub organiza os slides e aplica o template. Prévia editável com drag-and-drop permanece opcional e futura.
