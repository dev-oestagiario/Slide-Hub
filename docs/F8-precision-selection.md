# F8 — Seleção e redimensionamento de precisão

Extensão proposta após a F7, com foco no editor visual. A escrita continua como fonte principal; o editor manual permanece opcional.

- Retângulo de seleção independente da caixa Markdown, acompanhando a geometria do elemento.
- Oito alças nas bordas e cantos, com área de interação ampliada em toque.
- Redimensionamento ancora a borda oposta, respeita o tamanho mínimo e os limites da área.
- Imagens preservam a proporção do retângulo existente ao arrastar cantos; Shift faz o mesmo nos demais blocos.
- Alt desativa o encaixe; setas ajustam incrementalmente, Shift amplia o passo do teclado.
- Clique no espaço vazio ou Esc desmarca; a seleção não altera a camada salva.
- Nenhuma migration; mesmas coordenadas persistidas pela F4. Ainda não é um editor de texto inline nem oferece rotação/multisseleção.

Testar no Chrome desktop/mobile: selecionar título curto, alterar cada borda, redimensionar canto de imagem, mover sem redimensionar, verificar sobreposição, alternar layout automático e desfazer/refazer. Não publicar antes de integrar o PR #10 e validar a CI. A fixture E2E não verifica autenticação nem RLS.
