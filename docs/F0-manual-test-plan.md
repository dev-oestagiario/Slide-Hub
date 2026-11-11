# F0 — plano de validação manual para navegador

**Status:** cenários elaborados, execução presencial/end-to-end **pendente**. Não afirmar aprovação visual sem rodar.

## Autenticação e permissão
- [ ] Professor: criar disciplina/módulo/aula, salvar, publicar, despublicar e trocar tema.
- [ ] Aluno: visualizar apenas aulas publicadas de disciplinas públicas; não abrir editor de professor ou notas privadas.
- [ ] Sem login: redirecionar para autenticação e não acessar dados protegidos.
- [ ] Repetir consultas a Supabase como aluno e professor em ambiente de teste para confirmar RLS real.

## Conteúdo e privacidade
- [ ] Editar resposta com `##`, `<!-- slide -->` e blocos fenced dentro de `:::answer`, confirmar que resposta só aparece via ação "Revelar gabarito".
- [ ] Confirmar que apostila não mostra gabaritos, mesmo quando resposta está sem terminador.
- [ ] Conteúdo grande, tabelas largas, Markdown de imagem, Mermaid válido/inválido: não provocar corte silencioso nem quebrar navegação.
- [ ] Alternar modo apresentação e apostila sem modificar conteúdo da aula.

## Rascunhos e navegação
- [ ] Editar título ou texto; tentar mudar disciplina/módulo/aula: mostrar aviso e respeitar Cancelar.
- [ ] Editar e clicar início, logout, atualizar/fechar aba: avisar.
- [ ] Salvar alterações e navegar: não solicitar confirmação.
- [ ] Iniciar apresentação sem salvar: mostrar conteúdo atual; sair retorna ao rascunho ainda não salvo.
- [ ] Abrir dois navegadores com a mesma aula: verificar manualmente concorrência; autosave/versionamento ficam para F4.

## Responsividade e acessibilidade
- [ ] Verificar larguras 320, 375, 768, 1024, 1366 e 1920 px; orientação vertical e horizontal.
- [ ] Menu lateral, barra de ferramentas, modal de temas, upload e botões de navegação sem sobreposição.
- [ ] Navegação apenas com teclado: tabulação, foco visível, Escape, setas, atalhos na apresentação.
- [ ] Verificar alto zoom 200%, contraste de texto, leitor de tela e preferência por redução de movimento.
- [ ] Modo de apresentação não deve perder elementos quando a fonte aumenta; documentar overflow para F4/F5.
- [ ] Testar navegadores Chrome, Edge e Firefox; ditado deve apresentar fallback se indisponível.

## Automatização planejada
- F1: testes de componentes e captura visual responsiva com Playwright.
- F2: integração de templates, permissões de acesso e imagens.
- F4: fluxos de digitação/voz, autosave, persistência de posições, undo/redo e notas por ID.
- F5: suíte E2E com conta de professor/aluno de teste, acessibilidade WCAG 2.2 AA, performance e regressão de deploy.

## Critérios de saída
Os casos críticos (resposta privada, saída com texto não salvo, login, criação e apresentação) deverão passar antes do merge do redesign. A F0 não substitui a validação E2E; registra e implementa somente as proteções cobertas por testes automatizados do parser e estado de rascunho.
