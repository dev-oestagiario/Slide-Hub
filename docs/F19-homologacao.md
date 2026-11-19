# F19.5 — Homologação de TF em produção

O PR #22 foi integrado (78ddb5a) e a versão publicada verificada. A abertura de TF está disponível no frontend com bloqueio em caso de integração indisponível. CI, deploy e smoke público pós-merge concluídos com sucesso. A criação real não está homologada.

## Pré-requisitos
1. Criar um fine-grained PAT no GitHub limitado a dev-oestagiario/Slide-Hub, Issues read/write, com validade definida; cadastrar apenas no Edge Function Secrets do projeto Supabase kbezscxuhqculdvraqun com o nome SLIDEHUB_GITHUB_ISSUES_TOKEN. Nunca copiar o valor em mensagens, commits ou frontend.
2. Preparar duas contas de QA dedicadas e autorizadas, uma teacher e outra student. No ambiente GitHub slidehub-qa (configurar proteção/revisores), cadastrar os segredos SLIDEHUB_QA_TEACHER_EMAIL, SLIDEHUB_QA_TEACHER_PASSWORD, SLIDEHUB_QA_STUDENT_EMAIL, SLIDEHUB_QA_STUDENT_PASSWORD. Não utilizar credenciais de professores reais.
3. Após integrar o workflow, em GitHub Actions > Homologar TF em produção > Run workflow (main), primeiro executar sem a opção create_issue. Confirma login, papel efetivo, ausência do botão para aluno, 403 no endpoint para aluno e disponibilidade para professor, sem criar issue.
4. Se a verificação passar, executar manualmente uma única vez com create_issue marcado, autorizando uma issue sintética pública. O teste verifica o recibo, o link, a issue real e a repetição com o mesmo ID. Não reexecutar automaticamente a etapa de escrita; rerun é bloqueado. Se falhar após envio, consultar a issue pelo título com o identificador da execução antes de iniciar nova execução. Fechar a issue de teste pelo GitHub após conferência, se autorizado.

Nenhuma issue real ou nova conta foi criada neste trabalho. O fluxo automatizado não foi executado em produção por falta de confirmação das credenciais. Não confundir disponibilidade configurada com permissão efetiva de escrita do token.
