# F0 — plano de migração para editor híbrido sem perda de conteúdo

**Não executar DDL nesta fase.** Este é o contrato para implementar F2/F4 com migrations aditivas no Supabase.

## Modelo conceitual
- **Aula** mantém `lessons.markdown` como fonte canônica. Voz apenas adiciona texto; não envia áudio persistido por padrão.
- **Template** guarda aparência + regras automáticas de composição, versionadas e independentes do conteúdo; `slide_templates` legados permanecem e são interpretados como temas.
- **Slide** é uma segmentação do conteúdo criada pelo parser. ID não pode depender do índice atual nem do hash completo do texto (mudaria após digitar mais conteúdo).
- **Bloco** de texto/imagem/exercício representa parte semântica do Markdown; tem UUID persistente, metadados de origem e ordem.
- **Override de layout** é uma posição manual persistente ligada a `lesson_id + block_id`, opcionalmente slide_id. Template define o layout automático; override manual prevalece quando válido.

## Plano de evolução
1. Introduzir AST de blocos semânticos com ID persistente. Na primeira abertura de aula antiga, atribuir UUID para segmentos existentes, salvar metadados com versão do schema e manter `markdown` intacto.
2. Ao digitar, aplicar reconciliação de blocos estáveis com base em âncoras/edições do editor. **Não usar hash do texto como ID**, pois alterar uma palavra não deve apagar sua posição. Novos blocos ganham UUID; remoções explicitamente confirmadas aposentam o ID.
3. Criar tabela aditiva com geometria normalizada por bloco: `lesson_id`, `slide_id`, `block_id`, `x`, `y`, `w`, `h`, `z_index`, `locked`, `revision`, `updated_at`. Base lógica de 16:9, com coordenadas de 0 a 1 e limites/constraints numéricos, acesso por proprietário via RLS.
4. Migração gradual de `speaker_notes.slide_index` para `slide_id`, mantendo coluna antiga durante período de compatibilidade. Backfill do índice conforme snapshot da aula, não conforme renderização futura.
5. Render pipeline: Markdown -> AST/IDs -> divisão semântica -> template -> layout automático -> overrides -> validação de overflow/colisão -> render único para prévia e apresentação.
6. Operações separadas no histórico: edição textual e edição de geometria. Definir semântica unificada de desfazer/refazer e serialização de autosave, com atualização otimista e prevenção de conflito.
7. Ao aplicar outro template, manter overrides como padrão, apresentar aviso de colisões, dar opção de manter/limpar overrides de slide/bloco; nunca apagar o conteúdo.
8. Introduzir tabela/modelo de `presentation_templates` separado de `slide_templates` existentes, com `version`, `schema_version`, `owner_id`, `config`, `thumbnail`, `is_public` opcional; a aula usa snapshot de versão.
9. Backup antes de migrações; aplicar em ambiente de teste, validar contagens e dados, acompanhar logs, depois Dev/produção sob revisão.

## Invariantes de aceite
- Editar conteúdo de bloco com override não altera `block_id` nem `x/y/w/h`.
- Inserir bloco antes de outro não muda as notas ou posições de blocos existentes.
- Remover um bloco não afeta os outros; rollback de exclusão preserva associação.
- Após salvar, recarregar e reabrir a aula, geometria e conteúdo são iguais ao estado salvo.
- Quando o novo conteúdo não cabe na caixa fixa, sinalizar overflow e solicitar decisão do professor (ampliar, dividir, restaurar). Não cortar nem mover silenciosamente.
- Alunos/leitores não conseguem modificar ou ler dados privados além do permitido pela RLS.
- Aulas legadas e seus temas continuam abrindo depois das migrations.

## Estratégia de rollout
- F0: auditoria e testes de caracterização, **sem banco alterado**.
- F1: separar serviços e componentes mantendo comportamento.
- F2: migrations aditivas de templates e aplicação com snapshots.
- F4: IDs de blocos/slides, notas estáveis e overrides geométricos com feature flag; testes com editor híbrido e mecanismos de rollback.
