# SlideHub — Estúdio de Aulas Markdown

Aplicação educacional React + TypeScript + Vite + Tailwind CSS + Supabase.

## Funcionalidades do MVP

- Login e cadastro por e-mail usando Supabase Auth.
- Organização **Disciplina → Módulo → Aula** com papel professor/aluno.
- Editor Markdown e apostila gerada da mesma fonte.
- Conversor Markdown → slides (H2 e diretivas manuais).
- Apresentação 16:9 em tela cheia, teclado, progresso, gabarito revelável.
- Notas privadas do professor e prévia do próximo slide.
- Ditado via Web Speech API nos navegadores compatíveis.
- Tema Ice White e Dark Teal; importação de temas JSON.
- Políticas RLS em todas as tabelas do Supabase.
- Catálogo de 27 skills e script de instalação opcional.

## Executar

Requisitos: Node.js 22+ e projeto Supabase configurado.

1. Instale com \`npm install\`.
2. Copie \`.env.example\` para \`.env\` e preencha \`VITE_SUPABASE_PUBLISHABLE_KEY\` com a chave **publicável** do projeto Dev.
3. Execute \`npm run dev\`.
4. Abra o endereço mostrado pelo Vite.

O banco Supabase Dev já recebeu as tabelas. Para outro projeto, aplique a migration em \`supabase/migrations/20261110_educational_studio.sql\`.

O cadastro cria perfis de aluno. A função de professor deve ser atribuída por um administrador no SQL Editor, **nunca pelo formulário do navegador**:

\`\`\`sql
update public.profiles
set role = 'teacher'
where id = (select id from auth.users where email = 'professor@exemplo.com');
\`\`\`

Substitua pelo e-mail do usuário autorizado. Não exponha a chave \`service_role\` no frontend.

## Comandos especiais Markdown

| Sintaxe | Efeito |
|---|---|
| \`## Título\` | Inicia novo slide (configurável) |
| \`<!-- slide -->\` | Quebra manual |
| \`<!-- slide: theme=dark layout=center -->\` | Tema e layout |
| \`<!-- slide: layout=split -->\` | Duas colunas |
| \`:::exercise\` ... \`:::\` | Questão |
| \`:::answer\` ... \`:::\` | Gabarito privado até clicar para revelar |
| Bloco Markdown \`mermaid\` | Reservado para diagramas UML |

As anotações de Markdown são comentários e não são executadas como HTML. O modo apostila lê o Markdown diretamente.

## Temas

Use \`slide-template.example.json\` para importar um JSON com campos \`background\`, \`foreground\`, \`accent\` (cores hexadecimais) e opcionalmente \`fontFamily\`. Extração completa de PPTX e CSS ainda não faz parte do MVP.

## Skills de desenvolvimento

\`\`\`bash
npm run skills:check
npm run skills:install
npm run skills:install -- --only frontend-design,playwright
\`\`\`

O catálogo em \`skills/catalog.json\` inclui 27 skills verificadas no GitHub. A instalação requer internet, é **manual** e não roda no CI. Consulte \`AGENTS.md\`.

## Testes e limitações

\`\`\`bash
npm test
npm run build
\`\`\`

CI em \`.github/workflows/ci.yml\`.

**Limitações conhecidas:** ainda não existe exportação PPTX, extração visual de tema PPTX, modo offline, editor gráfico por blocos ou suporte multi-instituição. A experiência de navegação real precisa ser validada em ambiente com dependências instaladas e autenticação configurada.


## Apresentação com um clique

O professor escreve a aula em Markdown e clica em **Modo apresentação**. O conteúdo não precisa ser salvo primeiro: os slides são produzidos do texto que está no editor naquele momento. O botão tenta abrir tela cheia e mantém um modo de apresentação mesmo se o navegador bloquear fullscreen.

- Cada cabeçalho `##` inicia outro slide (opção desativável).
- `<!-- slide -->` cria uma quebra manual.
- `<!-- slide: theme=dark layout=center -->` altera tema e disposição.
- `:::exercise` e `:::answer` criam pergunta e resposta revelável.
- Setas, espaço e PageUp/PageDown navegam; botão fechar sai da apresentação.
- A prévia no editor permite navegar pelos slides antes de apresentar.
- Somente o professor vê o modo com notas privadas e o próximo slide.

## Publicação automática no GitHub Pages

Arquivo: `.github/workflows/deploy-pages.yml`.

O GitHub Actions instala dependências, executa testes, compila React/TypeScript/Vite com `base: '/Slide-Hub/'`, verifica o caminho dos assets e publica `dist/` no Pages a cada push na `main`.

**Ativação única:** no GitHub, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**. O GitHub Pages para repositórios privados depende de um plano que o suporte (como GitHub Pro/Team). O Pages hospeda o frontend estático; Supabase hospeda autenticação e dados. O deploy não converte o repositório em público, mas o site publicado pode ficar visível na web.

**Variáveis de frontend:** o arquivo `.env.production` contém somente a URL e a chave **publicável** do Supabase Dev. Essas informações são intencionalmente públicas no JavaScript distribuído. Nunca insira uma chave `service_role`, uma senha ou um token secreto em arquivos `VITE_*`.

Para confirmação por e-mail, configure em **Supabase → Authentication → URL Configuration**:
- Site URL: `https://dev-oestagiario.github.io/Slide-Hub/`
- URL de redirecionamento permitida: `https://dev-oestagiario.github.io/Slide-Hub/**`

Endereço esperado após a primeira publicação bem-sucedida: `https://dev-oestagiario.github.io/Slide-Hub/`.
