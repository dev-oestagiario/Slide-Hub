# Skills de desenvolvimento do SlideHub

O catálogo de fontes está em [catalog.json](./catalog.json) e os conjuntos em [bundles.json](./bundles.json). As **16 skills solicitadas** já estavam catalogadas; esta integração cria seleção em grupos, comandos consistentes e testes que protegem o catálogo contra faltas e duplicações.

| Conjunto | Skills | Finalidade |
| --- | --- | --- |
| `frontend` | `typescript`, `feature-arch`, `tanstack-query` | Tipagem, arquitetura por funcionalidade, cache de dados |
| `qa` | `webapp-testing`, `playwright`, `vitest`, `msw`, `test-driven-development`, `systematic-debugging`, `agent-browser` | Testes, automação, depuração, regressão |
| `engineering` | `improve-codebase-architecture`, `domain-modeling`, `codebase-design`, `code-review`, `writing-plans`, `supabase-postgres-best-practices` | Modelagem, revisão, planejamento, PostgreSQL |

## Verificar a seleção sem instalar

```bash
npm run skills:check -- --bundle frontend,qa,engineering
node scripts/install-skills.mjs --list
```

## Instalar manualmente no checkout do projeto

```bash
npm run skills:install -- --bundle frontend,qa,engineering
```

É possível instalar um grupo (`--bundle qa`), vários grupos separados por vírgulas, ou skills específicas (`--only playwright,vitest`). Não use `--only` e `--bundle` na mesma chamada. Sem filtros, a instalação tenta todas as entradas do catálogo.

### Cuidados
- `npx skills add` busca pacotes de terceiros e pode alterar arquivos locais. Revise os repositórios de origem e os efeitos do instalador antes de executar.
- Os conjuntos não instalam bibliotecas como `@tanstack/react-query`, `vitest` ou `msw` no aplicativo automaticamente; são **instruções/skills para agentes**, e não dependências do runtime.
- A instalação é intencionalmente **opt-in** e não roda no CI, no GitHub Pages ou no navegador dos professores.
- Não copie credenciais, tokens ou arquivos `.env` para diretórios de skills.
- Para alterações importantes, execute `npm test` e `npm run build` e revise o resultado antes do merge.
