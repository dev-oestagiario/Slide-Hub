# F12 — Biblioteca de elementos e organização de slides

## Escopo
- Dez formas vetoriais predefinidas (retângulo, arredondado, círculo, triângulo, losango, linha, seta, check, estrela e informação). Inserção pela biblioteca em um bloco Markdown `slide-shape`, renderizado como SVG na prévia, projeção e exportação. Pode ser movido, redimensionado e estilizado no editor visual. Não carrega SVG remoto nem executa conteúdo arbitrário.
- Miniaturas resumidas (título e primeiras linhas, sem gabaritos) com navegação. Painel lateral no estúdio ampliado e faixa rolável em telas pequenas.
- Reordenar e duplicar seções completas, incluindo suas continuações automáticas; preserva diretivas, resposta e IDs dos originais. Duplicação atribui novos IDs, preserva geometria/estilos, remove vínculo de grupo; não duplica notas privadas. O parser é validado antes de alterar a origem. Se houver sintaxe não identificável, seção vazia, fence/resposta sem fechamento ou ambiguidade, edição deve ser feita manualmente em Escrever.
- Histórico local de até 50 checkpoints de texto, título e layout. Agrupa digitação contínua em uma janela de 900ms; operações de edição visual e de seção entram no mesmo histórico. Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z; Ctrl+D para duplicar parágrafo/imagem selecionado, Ctrl+Shift+D para duplicar seção no modo visual. Atalhos não interferem em campos de propriedades, nem na edição de texto inline até aplicar.
- Sem novas migrations. Nomes e IDs persistem no JSON existente. O histórico não é persistido após recarregar a página e não inclui notas, templates ou alterações de publicação. Notas legadas sem chave estável exigem verificação autenticada antes de reorganizar.

## QA
Testes unitários de preservação do Markdown, respostas e IDs, e dois fluxos Playwright com o hook real em memória (sem credenciais/Supabase): mover/duplicar/inserir e verificar exportação; desfazer/refazer texto e posição. Miniaturas são resumos visuais e não capturas pixel a pixel do slide. As ações usam botões e não drag-and-drop para reordenar slides. QA autenticado e verificação de notas reais continuam necessários.

## Integração
PRs #10 -> #11 -> #12 -> #13 -> #14 (F11, correção E2E) -> F12. Não publicar automaticamente.
