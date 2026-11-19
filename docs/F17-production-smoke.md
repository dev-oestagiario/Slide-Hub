# F17 — Smoke de produção

O deploy F7–F17 já está publicado. Esta verificação usa a URL de produção e não a fixture Vite. O job público executa no PR e após deploy aprovado, em desktop e mobile, verificando inicialização, recursos, troca das telas de login/cadastro e overflow horizontal. Nenhuma conta é criada nem dados alterados.

O teste autenticado é opcional e somente workflow_dispatch da main com o ambiente slidehub-qa. Configure previamente:
- secrets SLIDEHUB_QA_TEACHER_EMAIL / SLIDEHUB_QA_TEACHER_PASSWORD e SLIDEHUB_QA_STUDENT_EMAIL / SLIDEHUB_QA_STUDENT_PASSWORD: contas de QA dedicadas e autorizadas, já confirmadas pelo fluxo normal de autenticação.
- variável SLIDEHUB_QA_LESSON_TITLE: título exclusivo de uma aula de teste publicada em disciplina pública, pertencente ao professor QA.
- secret SLIDEHUB_QA_PRIVATE_MARKER: marcador sintético e exclusivo que conste apenas no gabarito da respectiva aula.

No GitHub, Actions > Smoke SlideHub production > Run workflow > authenticated. Testa login real, RPC do proprietário contendo marcador, logout, login de aluno, mesma aula publicada sem marcador, novo logout. Nenhuma gravação de conteúdo, acesso a contas pessoais ou criação automática de usuários; captura de vídeo, screenshot e trace desativadas. Não enviar senhas no chat ou inserir no código. Configure o ambiente na interface GitHub com acesso restrito. Se faltar parâmetro o teste falha explicitamente.

Persistência mediante edição e recuperação de rascunho com conta dedicada continua um smoke manual: usar aula sintética, salvar alteração, recarregar, conferir, restaurar o conteúdo inicial. Testes SQL/HTTP isolados de revisão já aprovados; não substituir a homologação real por esses resultados. Não alterar as aulas existentes.

## Evidência local de homologação — 19/11/2026

Smoke equivalente executado diretamente contra a URL publicada (main `0550d281`), no dispositivo CQP-KAINA-72, Node 24.20.0 e Playwright 1.65.1 com Google Chrome headless. Resultado: desktop 1440×900 e mobile emulado 390×844 aprovados. HTTP 200, formulário de login visível, navegação cadastro → login funcional, zero erros JavaScript, zero recursos com HTTP >=400 ou requisições interrompidas na origem da aplicação. `scrollWidth` igual à largura da viewport (1440 e 390) tanto no login quanto no cadastro. O teste automatizado do PR foi reforçado para cobrir essas verificações. Esta evidência não substitui a execução do workflow com a versão de Playwright do projeto nem os testes autenticados. Nenhuma conta criada ou dado alterado.
