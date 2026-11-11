# F4 — Editor híbrido de texto + layout visual opcional

## Resultado
A escrita (Markdown amigável + ferramentas de inserção) e o ditado continuam como caminho principal. A prévia exibe os slides produzidos automaticamente e oferece, **opcionalmente**, o botão **Organizar visualmente**. Nesse modo o professor pode arrastar e redimensionar blocos. A aplicação grava as posições por ID estável, e edições posteriores no conteúdo preservam esses ajustes; novos blocos continuam no layout automático.

## Implementado
- **Modelo independente:** `src/features/editor/layoutModel.ts` extrai blocos visíveis do resultado do parser e reconcilia IDs estáveis entre mudanças, sem incluir respostas privadas (`:::answer`).
- **Geometria:** `x,y,w,h,z` normalizados (0–1). Suporte a arrastar, redimensionar, restaurar uma posição e mover por teclado (setas, Shift para passos maiores). Posição não depende do índice do slide.
- **Prévia e apresentação:** `SlideBlockCanvas` é usado pelas duas, com a mesma ordem/geométrica persistida. O modelo de template anterior é respeitado.
- **Salvamento:** `useLessonEditor` grava título, Markdown e geometria em uma mesma atualização, de modo serial e com controle otimista por `editor_revision`. Debounce de 1.100ms. Exibe `Salvando`, `Salvo`, `Pendente`, `Falha`.
- **Rascunho local:** backup em `localStorage` por conta/aula, recuperação com autorização do professor e remoção após gravação bem-sucedida.
- **Histórico de geometria:** desfazer/refazer ajustes visuais, limitados a 50 passos; não anuncia desfazer de texto.
- **Notas:** `speaker_notes.slide_key` opcional vincula notas ao ID persistente do bloco âncora; registros legados com índice são convertidos após salvar o layout e seguem com leitura de compatibilidade até lá.
- **Fluxos existentes:** publicação aguarda salvamento de texto/layout; persistem as telas de templates F2/F3, navegação, Markdown, ditado e apresentação. Permissões já existentes (professor/owner) continuam.

## Banco — aplicar somente depois de aprovação
`supabase/migrations/20261111_hybrid_slide_editor.sql` é **aditiva** e depende da migração F2 já aplicada. Adiciona:
- `lessons.editor_layout` (jsonb de blocos + posições);
- `lessons.editor_revision` (inteiro para prevenção de conflito entre abas);
- trigger de incremento de revisão ao alterar texto, título ou layout;
- `speaker_notes.slide_key`, índice único parcial para a referência estável e índice secundário para compatibilidade;
- **preserva a restrição antiga** de unicidade por índice para compatibilidade com o site já publicado; novas notas por chave usam índices disponíveis quando necessário.

**Não executar a migration na produção sem revisar dependências, backup e testes de autorização.** O código F4 só deve ir à `main` depois da migração ou por publicação coordenada. Se faltar `editor_layout`/`editor_revision`, o editor exibirá erro de salvamento; não escondê-lo.

## Integridade e limites
- IDs são reconciliados por texto e tipo de bloco, preservando ID em edições comuns. Reescrita completa com inserções simultâneas do mesmo tipo pode exigir redefinir manualmente a posição, pois a origem canônica ainda é Markdown e não há AST de edição transacional.
- A formatação de um slide complexo é aproximada por blocos de Markdown; o usuário pode usar **Restaurar layout automático** em um bloco caso um ajuste não seja adequado.
- O sistema detecta sobreposição entre blocos visíveis e excesso de texto em blocos fixados; exibe aviso, sem mover ou encolher automaticamente o bloco. O texto pode ser rolado dentro da região fixa, sem apagá-lo.
- Ausência de edição colaborativa: um salvamento concorrente gera aviso de conflito, sem sobrescrever silenciosamente a outra aba.
- O modo de ditado usa a API Web Speech quando disponível; sem suporte ao microfone o professor continua digitando normalmente. Não armazena áudio.
- No modo mobile, os controles também podem ser usados por teclado; arrastar depende de suporte do navegador para eventos Pointer.
- Em slides muito densos ainda há rolagem; divisão semântica assistida e exportação fiel ficarão para refinamento posterior.

## Cenários necessários para aprovação manual
1. Criar aula e digitar conteúdo; confirmar geração sem arrastar; clicar **Apresentar**.
2. Entrar em **Organizar visualmente**, mover e redimensionar um título e uma imagem; sair do modo visual e apresentar.
3. Editar o texto desse título e acrescentar um parágrafo; confirmar que o título permanece na posição e o bloco novo é automático.
4. Salvar, recarregar o navegador, abrir a aula novamente e verificar as mesmas posições.
5. Inserir novo slide antes de outro com nota; verificar que a nota permanece com o mesmo assunto.
6. Abrir a mesma aula em duas abas; simular conflito e confirmar que não há sobrescrita silenciosa.
7. Fechar durante edição e recuperar rascunho local (teste com cenário controlado).
8. Verificar Chrome/Edge/Firefox, 320/375/768/1366/1920 px, navegação por teclado e avisos de overflow.
9. Testar como aluno: somente aulas publicadas, sem modo de organizar, sem notas privadas, sem gravação no Supabase.
10. Garantir que gabaritos não apareçam na prévia nem em blocos arrastáveis.

## Gates de entrega
- `npm test`, `npm run build` e `npm run skills:check` aprovados em CI.
- PR revisado antes da publicação; **sem merge automático na main**.
- Migração SQL e checagem de RLS após aprovação.
- Testes autenticados reais e verificação visual ainda são necessários para afirmar produção completa.
