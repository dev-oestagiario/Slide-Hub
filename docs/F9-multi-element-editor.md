# F9 — Operações coletivas do editor visual

## Fluxo
1. Entre em Organizar visualmente. Selecione por Shift/Ctrl + clique ou ative Seleção múltipla para alternar elementos por toque, mouse ou teclado.
2. O painel mostra a quantidade de selecionados e oferece alinhamento pelas bordas/centros, distribuição horizontal/vertical de três ou mais elementos, agrupamento/desagrupamento e bloqueio/desbloqueio.
3. Desative Seleção múltipla para arrastar a seleção mantendo a distância relativa, ou use as setas. Cada gesto tem um checkpoint de undo, e cada operação escreve todos os overrides em uma atualização de estado.
4. Em um elemento individual, gire em passos de 15° para a esquerda/direita. A rotação usa o centro do retângulo, é exibida também na apresentação e no HTML/PDF.
5. O bloqueio impede movimentação, rotação e reset pelo editor; é reversível. Bloquear ou agrupar não altera o Markdown.

## Dados
O JSON de editor_layout mantém schemaVersion 1 e estende cada retângulo com campos opcionais normalizados: rotation (ângulo finito 0–359...), locked (true) e group (identificador). Dados antigos não ganham campos desnecessários. IDs reconciliados continuam preservando overrides, inclusive metadados. Não há migração SQL nova. Grupos são selecionados apenas no slide atual; se a paginação automática separar elementos, a operação atua nas partes do slide aberto.

## Limitações conscientes
- Agrupamento é lógico: não transforma blocos em um único objeto nem permite redimensionamento coletivo.
- Elementos girados não usam alças de redimensionamento (o inspetor continua disponível). Rotação pode levar a extremos fora da área útil, com aviso de overflow; o professor pode reposicionar ou retornar a 0°. O alinhamento e a distribuição usam os retângulos sem rotação.
- Distribuição requer espaço suficiente entre os elementos externos; não sobrepõe elementos para forçar uma distribuição.
- A seleção múltipla não grava até uma ação explícita. Elementos automáticos selecionados podem precisar de nova seleção após mudança de viewport.
- A fixture Playwright não autentica no Supabase, não demonstra RLS real.

## QA
Testes unitários: operações coletivas, limites, persistência de metadados e bloqueio. Playwright desktop/mobile: seleção, grupo, alinhamento, bloqueio/desbloqueio, movimento coletivo por teclado, rotação e texto preservado. Integrar após F7 (#10) e F8 (#11), mantendo a edição manual opcional.
