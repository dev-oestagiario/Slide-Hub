# F11 — Edição direta e estilos individuais

## Funcionalidades
- Duplo clique ou ação Editar texto abre edição do título/parágrafo sobre a prévia. Salvar modifica o Markdown original, preservando IDs, posições e conteúdo privado. Não é um editor rich-text: o formulário mantém Markdown e não permite criar novas estruturas em uma única operação.
- Painel individual: família de fonte, escala relativa, cor, fundo, borda, arredondamento e opacidade. Estilos são opcionais e normalizados no JSON de layout, com a mesma renderização na prévia, apresentação e HTML/PDF.
- Imagens: conter ou preencher, recorte visual não destrutivo por posição horizontal/vertical. Não altera o arquivo original.
- Copiar Markdown de qualquer bloco disponível; duplicar parágrafos e imagens quando a origem pode ser identificada sem ambiguidade. A cópia recebe ID próprio, deslocamento inicial e estilos, sem grupo/bloqueio.
- A edição da origem valida toda a sequência de blocos visíveis e os gabaritos antes de gravar. Em caso de duplicatas ambíguas, sintaxe complexa, bloqueio ou mudança estrutural, usar Escrever. O histórico exclusivamente geométrico é reiniciado após alteração direta de conteúdo para não restaurar IDs obsoletos.
- Nenhuma migração SQL. O layout existente permanece compatível.

## QA
Testes unitários de validação de origem, IDs, privacidade e normalização de estilos. Playwright desktop/mobile de edição, estilos, duplicação e recorte. A fixture não valida RLS nem autosave autenticado. Conferir manualmente exportação, edição de texto longo, imagem crop, conflitos de revisão e layout persistido com uma conta real.
Integração: PRs #10 → #11 → #12 → #13 → F11.
