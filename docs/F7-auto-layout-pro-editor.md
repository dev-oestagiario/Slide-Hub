# Evolução — Auto-organizador 16:9 e editor visual de precisão

## Problema reproduzido
Em slides com uma imagem grande, texto, listas ou código, os elementos podiam ocupar mais altura do que a área útil da prévia ou projeção. O editor visual anterior só permitia movimentar e redimensionar por duas alças, sem seleção e alinhamento adequados. Em telas pequenas, os painéis de texto e prévia disputavam espaço.

## Correções
### 1. Paginação automática sem alterar o texto do professor
`src/features/editor/autoOrganizer.ts` analisa a saída do parser e estima o custo visual de títulos, parágrafos, imagens, tabelas, listas, citações e código. Conteúdo acima de uma capacidade normalizada gera **slides adicionais de continuação** (inclusive depois de uma imagem grande). Listas extensas são divididas por item; conteúdo indivisível, como um bloco de código, permanece inteiro. O Markdown original da aula não é alterado.

A paginação acontece uma única vez no estado derivado `useLessonEditor.parsed`; essa saída é usada pela prévia, pelo modo apresentação, pelas notas por chave estável e pela exportação HTML/PDF. Gabaritos privados ficam no campo `answer`, nunca concatenados ao conteúdo apresentado, e são associados somente à última parte do slide dividido.

**Compatibilidade:** IDs de blocos continuam reconciliados por conteúdo e tipo, e posições manuais persistidas em `lessons.editor_layout` não são substituídas pelas regras automáticas. Ao dividir um bloco originalmente único, posições podem exigir revisão se o texto mudar totalmente.

### 2. Ajuste de conteúdo segundo o espaço real
`src/features/editor/SlideAutoFit.tsx` mede a área útil e a altura renderizada (ResizeObserver, MutationObserver e carregamento de imagens). Conteúdos não posicionados manualmente recebem escala proporcional para permanecer dentro do slide. Imagens têm limites proporcionais à altura do canvas; tabelas e blocos de código possuem rolagem interna.

**Último recurso:** um único bloco extremamente longo, que não admite divisão sem quebrar sua sintaxe, pode exigir rolagem dentro do slide para manter legibilidade. A apresentação não deixa mais o conteúdo escapar para fora da área visível. Não cortamos nem apagamos texto silenciosamente.

### 3. Editor visual profissional, mas opcional
- Clicar em um bloco para selecioná-lo; arrastar diretamente o elemento.
- Alças de redimensionamento e deslocamento, incluindo setas do teclado; Shift acelera; Alt desativa o encaixe.
- Grade visual e encaixe magnético, com guias de centralização.
- Painel de propriedades: X, Y, largura e altura em percentuais da área; alinhamentos horizontal/vertical; enviar para trás / trazer para frente; posicionamento otimizado de imagens; retorno ao layout automático.
- Zoom da prévia de 75% a 150%, sem alterar dimensões reais ou posições salvas.
- Continuidade do autosave, desfazer/refazer e persistência de geometria em coordenadas normalizadas.
- Mensagens de blocos que se sobrepõem ou têm conteúdo maior que o retângulo manualmente definido.

### 4. Interface responsiva
- Em telas abaixo de 950px, o professor alterna entre **Escrever** e **Ver slides**; no desktop as áreas continuam lado a lado.
- A prévia mantém proporção 16:9 e oferece rolagem **do zoom**, não da página inteira.
- Alças e campos de propriedades mais acessíveis em celular, com pontos de toque maiores.

## Segurança, dados e limites
- Nenhuma migration SQL nova: reusa `editor_layout` e `editor_revision` da F4.
- Sem serviço externo nem geração de imagens; o conteúdo continua originado do Markdown existente.
- A interface de arrastar continua opcional. Layout manual fixado tem precedência; o auto-organizador não move os elementos que o professor posicionou de propósito.
- Isto é um organizador **determinístico baseado em regras**, não um gerador de slides por IA. A estimativa de tamanho evita a maioria dos excessos, e a medição DOM resolve as diferenças reais de fonte e tamanho.
- Testes autenticados com professor e aluno e avaliação visual em projetores ainda são recomendados antes do deploy; a fixture de Playwright não valida RLS.
- Não equivale a todos os recursos de Canva/PowerPoint (animações, edição inline de texto como shapes, máscaras e colaboração simultânea estão fora do escopo).

## Testar antes de integrar
1. Imagem 1920×1080 seguida de parágrafos longos: aparecimento de slides adicionais, sem texto fora da área.
2. Listas com 15+ itens, tabelas, código extenso e várias imagens.
3. Slides curtos não devem ser quebrados desnecessariamente.
4. Posição manual de título/imagem → editar Markdown → recarregar → posição mantida.
5. Seleção, arraste, redimensionamento, grades/Alt, alinhamentos, coordenadas em %, camadas e desfazer/refazer.
6. Trocar entre prévia e apresentação; confirmar posição, conteúdo e numeração.
7. Mobile 320/375/390/768px, touch, desktop 1366/1920px, foco de teclado.
8. Exportar HTML/PDF após paginação e conferir conteúdo, imagens e todas as páginas.
9. Aluno não vê notas privadas nem controles de edição. Isolamento real do gabarito na camada de dados é uma questão independente, já documentada nas fases anteriores.

## Portas de validação
`npm test`, `npm run build`, `npm run skills:check` e `npm run test:e2e` no GitHub Actions. Integrar só depois de CI verde e revisão do PR.


### Correção de seleção do elemento (PR #10)
No modo Organizar visualmente, blocos **sem largura fixada** passam a usar `width: fit-content` e limite de 100% da área do slide. A borda de seleção acompanha as dimensões renderizadas do título, texto ou imagem, não a largura total do canvas. As caixas com coordenadas já salvas mantêm exatamente sua largura personalizada. O inspetor inicializa o tamanho pelo retângulo visual medido e só usa o tamanho mínimo aceito pelo esquema para itens minúsculos. Testes Playwright cobrem título curto, largura medida no inspetor e persistência da dimensão ao selecionar novamente.
