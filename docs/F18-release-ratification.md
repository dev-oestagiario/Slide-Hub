# F18 — Ratificação e publicação

## Evidência aprovada
- Revisão candidata validada: b23ddcec2a548358ea9c309468f6271376ee08f2.
- [CI Linux](https://github.com/dev-oestagiario/Slide-Hub/actions/runs/44529763143): validate, e2e e security-sql concluídos com sucesso, incluindo npm ci, audit, testes unitários, build, skills, PostgreSQL e PostgREST descartável.
- [Smoke público](https://github.com/dev-oestagiario/Slide-Hub/actions/runs/44529763004): aprovado; job authenticated ignorado conforme configuração.
- O smoke público do PR observa o site anterior, não o código candidato. A verificação do artefato no Pages acontece após deploy.

## Critérios de publicação
1. CI da revisão final aprovado e PR sem conflitos.
2. Autorização explícita de integração à main (AGENTS.md).
3. Workflow de deploy: build cria dist/release.json com SHA Git e SHA-256 do index.html; apenas main publica.
4. Smoke pós-deploy compara SHA esperada e digest do HTML servido, além de login/cadastro responsivo. A ausência de manifesto em PR não é falha, pois o site pode estar na revisão anterior.
5. Homologação autenticada em produção com contas exclusivamente QA e aula sintética, conforme F17-production-smoke.md.
6. Validar manualmente edição e persistência dessa aula QA, incluindo recuperação e conflito de revisão; restaurar o conteúdo inicial.

## Decisão
Ratificação técnica do CI aprovada para a revisão acima. A integração e publicação da revisão nova permanecem pendentes; homologação autenticada e persistência real ainda não aprovadas. Não executar scripts de banco descartável contra produção, não cadastrar contas reais automaticamente. Aviso de tamanho de chunks e dois avisos Supabase documentados em F17.2.

Se o smoke pós-deploy falhar, não declarar lançamento concluído. Inspecionar execução e versão publicada; correções/reversão devem ser explícitas e revisadas, sem alterar dados reais.

## Testes da preparação F18
- Windows CQP-KAINA-72: 98/98 testes unitários aprovados, incluindo integridade do HTML, revisão incorreta, manifesto ausente/inválido e build vazio.
- Script executado sobre o build existente: release.json gerado com SHA completa e digest de index.html.
- Smoke público: 2/2 desktop/mobile aprovados; dois testes novos de versão ignorados de propósito sem EXPECTED_RELEASE_SHA. A verificação real da revisão publicada depende do deploy.
- CI da F18 deve repetir a criação do manifesto antes da integração. A execução manual do deploy está restrita à main.