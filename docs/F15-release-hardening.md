# F15 — Homologação integrada e critérios de publicação

## Base
F7–F14: PRs #10 a #17 empilhados, main permanece F0–F6. F13 CI 44503853734 aprovada. Corrigida uma condição JSX incompleta no relatório F14; CI 44507484134 aprovada no commit 95d7a27. Sem novas funcionalidades ou alterações de produção.

## Revisão e correções
- Auto-organização: preservar linhas contíguas de tabelas, citações e listas aninhadas; somente listas simples são segmentadas. O fallback de rolagem continua necessário para blocos indivisíveis.
- Exportação: nunca renderizar conteúdo de layout salvo que diverge dos blocos canônicos da página; desconsiderar overrides incompatíveis. Respeitar showHeader na identidade. Tipografia relativa à página, área útil uniforme, pré-verificação DOM para overflow de blocos/rolagem e confirmação explícita antes de exportar com risco. Não é garantia de fidelidade em todos os navegadores/impressoras. Imagens remotas ainda precisam de internet; Mermaid ainda sai como código. Teste gera PDF real no Chromium desktop e confere a quantidade de páginas.
- Acessibilidade: Shift+Tab na raiz do modal retorna ao último controle; foco ignora ancestrais inert/aria-hidden e visibilidade escondida.
- Notas: restringir ao ID da aula ativa e aguardar carga das notas; updates incluem lesson_id; descartar resposta de salvamento de nota antiga após troca de aula. Finalizar ditado e fechar apresentação/exportação ao trocar de aula. Gatilhos de apresentaçao só com editor pronto.
- Validação: novos testes unitários de estruturas e exportação desatualizada, Playwright de geração PDF e preflight de overflow; suíte completa existente desktop/mobile. Supabase Dev indisponível na tentativa de consulta de políticas; Termux localhost possui Debian e Chromium, mas Node 20 não é suficiente para a suíte com strip-types. CI disponível.

## BLOQUEADORES para produção
1. **Gabaritos no acesso do aluno**: revisão de código confirma que App faz SELECT * de lessons e migration inicial permite leitura da linha publicada em disciplina pública a autenticados. RLS é por linha e não protege o campo markdown de um aluno autorizado a ler a aula. Ocultar na interface/exportação NÃO protege diretamente a API. É preciso separar conteúdo privado (inclusive layout antigo/caches contendo texto privado) e disponibilizar uma projeção sanitizada para alunos, com RPC/política de acesso de dono, preservar IDs/revisões dos elementos. Não aplicar migração sem validar a conta e schema real. Não publicar novos materiais privados nessa configuração sem avaliar o risco. Política real retornou indisponibilidade, então não houve confirmação no banco real.
2. **Homologação autenticada**: testar contas distintas professor/aluno, RLS de aula/nota/gabarito, autosave e conflito de revisão, alteração/reordenação/duplicação de seções, notas legadas, recuperação do rascunho, relogin; nenhum teste de fixture comprova banco real.
3. **Histórico de migration**: slots repetidos 20261110 e 20261111 no repositório. Reconciliar com histórico real antes de executar Supabase CLI; não reaplicar migração já registrada.
4. **QA visual**: 320/390/768/1366/1920px, imagens grandes, conteúdo extenso / recorte, manual e automático, apresentação e exportação/PDF, teclas, zoom, rotação, camadas, linha do tempo. Revisar limites em grupos e todos os alertas de overflow. O fluxo principal segue escrita → prévia → apresentar.

## Ordem de rollout
Não fazer merge enquanto houver regressão ou bloqueio de segurança/compatibilidade. Validar no ambiente de homologação a ponta desta branch (inclui fases anteriores); resolver proteção de gabarito antes do lançamento. Revisar PRs #10 → #11 → #12 → #13 → #14 → #15 → #16 → #17 → F15 em ordem, verificando heads/CI e coordenando alteração de schema compatível antes de frontend que a necessita. Como main faz deploy automático, evitar publicar intermediários sem gate. Depois CI, Pages e smoke autenticado. Nenhuma alteração ao Supabase nem deploy nesta fase.
