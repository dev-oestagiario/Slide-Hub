# SlideHub — orientações para agentes

Projeto React + TypeScript + Vite + Tailwind CSS com Supabase para plataforma educacional.

## Fluxo obrigatório
1. Avalie a alteração e isole a causa raiz quando houver bug.
2. Siga os padrões de React, composição de componentes e UI/UX documentados em skills/catalog.json.
3. Mantenha o Markdown como fonte da aula; não salve slides duplicados.
4. Use src/lib/slideParser.ts para transformar Markdown em slides. Atualize testes sempre que alterar a gramática.
5. Verifique experiência móvel, acessibilidade, contraste, teclado e estados vazios.
6. Proíba qualquer chave Supabase service_role no frontend. Use apenas chave publishable e RLS.
7. Rode npm test e npm run build antes de publicar.
8. Prefira commits pequenos; push na main apenas quando explicitamente solicitado.

## Instalação opcional de skills
npm run skills:check
npm run skills:install
npm run skills:install -- --only frontend-design,playwright

Fontes de terceiros devem ser inspecionadas antes de executar scripts. O instalador não roda automaticamente no CI.
