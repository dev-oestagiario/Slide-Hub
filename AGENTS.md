# SlideHub — orientações para agentes

Projeto React + TypeScript + Vite + Tailwind CSS com Supabase para plataforma educacional.

## Fluxo obrigatório
1. Avalie a alteração e isole a causa raiz quando houver bug. Use `systematic-debugging`.
2. Planeje mudanças incrementais com `writing-plans`; aplique `domain-modeling`, `codebase-design` e `improve-codebase-architecture` antes de refatorações amplas.
3. Organize o frontend por funcionalidades (`feature-arch`), com tipagem TypeScript explícita nos contratos públicos e revisão por `code-review`.
4. Prefira `tanstack-query` para estado assíncrono/cache do servidor quando a dependência for introduzida; evite duplicar esse estado em componentes.
5. Mantenha o Markdown como fonte da aula; não salve slides HTML duplicados. Diferencie tema (aparência) de template (aparência + layouts + composição reutilizável).
6. Use `src/lib/slideParser.ts` para transformar Markdown em slides. Atualize os testes da gramática quando alterar o parser.
7. Teste fluxos críticos primeiro (`test-driven-development`), com `vitest`/mocks `msw` quando configurados e `playwright`/`webapp-testing`/`agent-browser` em testes de navegador.
8. Verifique experiência móvel, acessibilidade, contraste, teclado, carregamento, estados vazios e erros. Não alegue testes de navegador que não foram executados.
9. Proíba qualquer chave Supabase `service_role` no frontend. Use apenas chave publishable e RLS; consulte `supabase-postgres-best-practices` para banco, índices e políticas.
10. Rode `npm test` e `npm run build` antes de publicar. Prefira commits pequenos; push na `main` apenas quando explicitamente solicitado.

## Skills no projeto
As 16 skills de frontend, QA e engenharia foram agrupadas em `skills/bundles.json` e cada origem está identificada em `skills/catalog.json`.

Comandos:
```bash
npm run skills:check -- --bundle frontend,qa,engineering
npm run skills:install -- --bundle frontend,qa,engineering
npm run skills:install -- --bundle qa
npm run skills:install -- --only typescript,playwright
node scripts/install-skills.mjs --list
```

**Atenção:** o catálogo e os conjuntos não são a instalação física das skills. A instalação só acontece ao executar `skills:install` no ambiente de desenvolvimento. Inspecione as fontes de terceiros antes de instalar; não execute scripts de instalação no CI ou no deploy de produção. Mais detalhes: `skills/README.md`.
