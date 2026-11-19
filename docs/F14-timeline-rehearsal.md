# F14 — Linha do tempo e ensaio

## Comportamento
- Entradas e saídas são sequenciais; as saídas opcionais ocorrem após as entradas. Ordem de entrada e de saída independentes, controle por botões na linha do tempo, duração de 100–2000 ms, espera de 0–30000 ms.
- O tempo de permanência (500–120000 ms) começa após a última entrada e antecede a primeira saída, ou a troca do slide quando não há saídas. Duração da transição de 100–2000 ms. A linha do tempo apresenta estimativa e barras proporcionais.
- Apresentação inicia manual. Avançar/voltar percorre eventos; autoplay inicia por botão, pausa e retoma reiniciando o intervalo corrente, para no final, pausado em aba oculta, ao abrir ajuda, índice ou revelar solução. Navegar manualmente ou reiniciar cancela autoplay.
- Prévia manual ou temporizada do slide, preservando Markdown, geometria e IDs. Exportação estática mostra todos os elementos. Movimento reduzido desativa efeitos visuais sem desativar a sequência.
- Ensaio do professor mede o tempo por slide (inclui leitura de notas e espera manual), exibe relatório ao encerrar; dados locais da sessão, sem alteração automática das durações salvas.
- Configurações opcionais e normalizadas no JSON existente, undo/redo e duplicação de seção; nenhuma migração SQL. Saída requer entrada configurada, transições e tempo são associados ao primeiro bloco da página. Não há timeline de efeitos simultâneos, sincronização de áudio ou exportação animada.

## QA
Testes unitários: ordem, fases, tempos e normalização. Playwright: saída e retorno, autoplay/pause/resume, relatório e exportação estática, desktop/mobile. Testes autenticados com Supabase e avaliação de fidelidade em projetor ainda pendentes. Integrar somente após PRs #10–#16.
