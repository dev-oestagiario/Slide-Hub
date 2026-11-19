# F19 — TF de professor
Objetivo: professores autenticados enviam sugestões e problemas diretamente ao repositório Slide-Hub, sem conta GitHub. Botão global no cabeçalho, formulário acessível, retorno do número e link somente após criação confirmada. Não enviar automaticamente identidade, conteúdo de aula, IDs ou dados de alunos. O texto exige confirmação explícita: pode ficar público. Sem anexos nesta versão.

## Segurança e operação
- Function teacher-feedback verifica JWT via Auth, papel real em profiles, origem, tamanho e esquema do payload. O destino GitHub é fixo. Token exclusivamente no servidor.
- Migration cria registro privado de entrega (UUID, horário e número). RPCs restritas ao service_role; cinco reservas/hora por professor, 50 no total. Reenvio com mesmo UUID retorna recibo ou indica envio pendente, sem duplicar issue. Reservas incertas ficam 30 dias; limpeza oportunista. Texto não fica armazenado no Supabase.
- Não usar token amplo ou token no frontend. No GitHub, criar fine-grained PAT limitado ao repositório dev-oestagiario/Slide-Hub, Issues: Read and write, prazo limitado. No Supabase, cadastrar SLIDEHUB_GITHUB_ISSUES_TOKEN nos Edge Function Secrets (sem colar em chat ou commit).
- Aplicar migration após aprovação e validação isolada, publicar function teacher-feedback com verificação JWT habilitada; se gateway não aceitar JWT do projeto, revisar compatibilidade e preservar a validação explícita getUser. Não alterar configurações globais de Auth. Publicar frontend após backend e segredo configurados.
- Teste de produção só com professor QA autorizado e conteúdo sintético, evitando issues repetidas. Se issue criada mas resposta perdida, procurar pela referência do envio no GitHub antes de abrir outra. O link pode exigir acesso ao repositório se privado; o envio não depende de conta GitHub.

## Verificação da entrega candidata
- 104 testes unitários aprovados; 6/6 testes Playwright desktop/mobile com GitHub simulado, sucesso, erro, nova tentativa e botão oculto para aluno; build de produção aprovado (aviso de chunks >500 kB); Deno check da Edge Function aprovado.
- Banco e função de produção não alterados. Testes SQL de autorização/limite serão executados pelo CI descartável. Integração real depende da configuração do segredo e da aprovação de publicação.
- Repositório público e Issues habilitadas, verificados. Evitar qualquer identificação pessoal na descrição.