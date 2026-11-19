# F10 — Estúdio de camadas e precisão

## Escopo
- Painel de camadas ordenado por profundidade e ordem do Markdown: seleção por nome, seleção múltipla, identificação de elementos agrupados/bloqueados e ajuste de profundidade individual. Permite selecionar um bloco coberto por outro sem deslocá-lo.
- Redimensionamento uniforme de uma seleção pelas quatro alças de canto. Mantém distância proporcional, metadados e canto oposto, preservando o conteúdo. Limita dimensões mínimas e área do canvas.
- Rotação individual livre pelo mouse (ângulo medido no sistema de pixels); Shift encaixa em 15°, setas do teclado fazem ajuste incremental. A rotação existente continua no modo apresentação/exportação. 
- Guias magnéticas entre centros e bordas de elementos não selecionados, usando a medição real dos blocos; Alt ignora o encaixe. A prioridade de guia entre elementos precede a grade.
- Editor visual ampliado que reutiliza o estado/ações do editor, permite continuar navegando entre os slides, mantém notas e histórico, restaura foco ao fechar e adapta o painel em mobile.

## Compatibilidade e limites
Sem migração: dados do F9 permanecem compatíveis. A escrita continua sendo o caminho principal. Grupos com membros bloqueados/rotacionados não oferecem escala coletiva; a rotação é individual e pode gerar overflow (aviso existente). O painel usa níveis de profundidade 0–100 e não oferece drag-and-drop de reordenação; níveis iguais mantêm a ordem de renderização. Guias são calculadas para retângulos não rotacionados e para a seleção durante movimento, não no resize. Ajustes não alteram Markdown. 
O modo ampliado é um editor em toda a viewport e não a API de fullscreen do sistema; Escape fecha se não estiver sendo consumido por uma seleção. A suite isolada não valida RLS ou autosave autenticado.

## Verificações
Unitários para geometria, guias, escala e rotação; Playwright para seleção de camadas sobrepostas, escala coletiva pelo teclado e rotação incremental. Revisar manualmente drag do grupo, rotação pelo mouse, guia magnética, modo ampliado em celulares/projetores e persistência autenticada antes da produção.
Integração: F7 (#10), F8 (#11), F9 (#12), F10.
