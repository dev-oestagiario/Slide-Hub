# SlideHub — Redesign e evolução do fluxo do professor

Data: 2026-11-10. Código-base: React 19, TypeScript, Tailwind CSS 4, Vite, Supabase.
Referências de trabalho: frontend-design, ui-ux-pro-max, vercel-react-best-practices e Supabase/Postgres Best Practices.

## Problema observado
O menu de JSON de templates exigia conhecimento técnico; o modo claro/escuro não preservava preferências por aula. A criação do conteúdo usa Markdown, mas antes o tema não podia ser visualizado ou alterado como um único conjunto.

## Entregue — Etapa 1: Estúdio de temas
- Botão **Personalizar slides** na barra de edição.
- Galeria de seis temas: Gelo, Petróleo, Areia, Noite, Aurora e Cobalto.
- Escolha de cor de fundo, gradiente, texto, destaque, fonte e imagem JPG/PNG/WebP.
- Imagens enviadas ao Supabase Storage por professor autenticado, até 3 MB.
- Escurecimento e enquadramento da foto para preservar a legibilidade.
- Prévia ao vivo com o texto real da aula e proporção 16:9.
- Salvar tema para reutilizar em outras aulas; suporte a temas JSON antigos no menu avançado.
- Aplicação global persistida por aula em lessons.theme_config, inclusive para estudantes.
- A apresentação e a prévia usam uma função central de estilização, sem duplicar regras.
- Tabela RLS e políticas do bucket limitam a criação de arquivos ao professor.
- Novas opções no editor para citação, tabela, upload direto de imagem, código e 2 colunas.

## Fluxo principal
1. Professor abre sua aula Markdown.
2. Clica em Personalizar slides.
3. Escolhe um modelo pronto ou envia seu próprio fundo.
4. Ajusta cores e legibilidade na prévia.
5. Clica em Aplicar a todos os slides. A aplicação é gravada imediatamente no Supabase.
6. Clica em Modo apresentação. Todas as páginas usam o mesmo tema.
7. Opcional: guarda o estilo como Meu tema para reutilizar em outra aula.

## Diretrizes do redesign
- Componentes interativos explícitos e com rótulos; nada de campos JSON obrigatórios.
- Superfícies gelo (#F4F7F6), petróleo (#12544F), acento teal (#1E7C74).
- Controles táteis com leve relevo e foco visível no teclado.
- Tema desacoplado do Markdown: documento representa semântica, tema representa apresentação.
- Presets e temas salvos, sem duplicar documentos por versão.
- Fotos públicas só para fundos não sensíveis. O bucket é público para apresentações compartilhadas.

## Próximas etapas recomendadas
R1 — Editor split view ajustável; salvamento automático com indicador; visão sequencial de miniaturas.
R2 — Galeria de mídia e editor visual de blocos de imagem e comparações Antes/Depois (upload direto já disponível na etapa 1).
R3 — Blocos de atividade: múltipla escolha, arrastar termos, respostas e critérios de correção; gerenciamento de gabaritos por papel.
R4 — Layouts especiais: capa, timeline, três colunas, imagem + texto, destaque de código e diagramas.
R5 — Biblioteca compartilhada de temas por disciplina e padronização institucional. Extração assistida de PPTX como funcionalidade futura, com revisão antes de aplicar.
R6 — Modo professor em janela independente, controle de tempo, atalhos, exportação PDF/PPTX e feedback de alunos.

### Limitações da etapa 1
O upload de imagens pode ser usado no fundo e dentro do conteúdo; as imagens ficam públicas mediante URL. O fundo é público mediante URL e não deve conter informações privadas. Temas globais prevalecem sobre comandos antigos de troca de cor por slide, preservando uniformidade.
