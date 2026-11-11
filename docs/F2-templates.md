# F2 — Templates de apresentação reutilizáveis

## Contrato de produto
- **Tema**: cores, fundo, fonte.
- **Template completo**: tema + regra de layout para abertura, conteúdo e exercício + rodapé padrão; nenhuma mudança em texto, notas ou links.
- **Professor escreve/dita** e o sistema aplica composição automaticamente. A personalização de posição por arrastar fica para F4.
- Templates internos de exemplo são definidos no código; templates pessoais ficam em `public.presentation_templates`.
- Ao aplicar, a aula recebe um **snapshot** independente da origem; editar ou excluir o template não muda silenciosamente aulas antigas.
- Tema legado `slide_templates` e `lessons.template_id` continuam presentes. F2 não apaga dados legados.

## Migração
Arquivo `supabase/migrations/20261111_presentation_templates.sql`, **não executado no banco durante o PR**. Aplicar somente após revisar PRs #3 (F0), #4 (F1), #5 (F2) e validar no ambiente de teste/Dev. `presentation_templates` contém owner e RLS para professores; as aulas ganham `presentation_template_id` e `presentation_template_snapshot`. Uma trigger confere a propriedade do template ao associá-lo à aula. Não armazenar chave de serviço no frontend.

## Biblioteca
- Catálogo com modelos internos e meus modelos, filtros e busca.
- Criar um modelo pessoal visualmente usando cores, fonte e regras de layout sem JSON.
- Salvar edição, duplicar, excluir, verificar revisão de concorrência e aplicar a uma aula.
- Área da aula permite abrir a biblioteca sem perder texto não salvo.
- Rodapé e layouts são comuns na prévia e no modo apresentação.
- Excluir o registro mantém snapshot de aulas; o vínculo da FK é limpo automaticamente.

## QA
- Testes de normalização e conversão de layout, isolamento de snapshots e shape do patch de aplicação.
- CI obrigatória: npm test; npm run build; npm run skills:check.
- Pendente: E2E autenticado para RLS, criação e uso entre professores, upload de imagem e responsividade.
- F3 aprofundará a edição do template, permitindo composição avançada, tipos adicionais e recursos visuais sem impor drag-and-drop.

## Rollout
1. Integrar PRs #3, #4 e #5 na ordem e aguardar CI.
2. Executar migration aditiva no Supabase Dev com backup/testes de políticas; conferir advisors.
3. Testar professor e aluno autenticados no site e criar/aplicar/duplicar/excluir.
4. Liberar a funcionalidade para demais usuários após teste E2E.

### Observação para uploads na biblioteca
Envio de imagem de fundo fica disponível em **Meus templates** mesmo sem aula aberta. O controle é pelo papel de professor e pelas políticas do bucket Supabase (RLS), não pela aula atualmente selecionada.
