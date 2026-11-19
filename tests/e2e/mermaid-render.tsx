import {createRoot} from 'react-dom/client'
import {MarkdownView} from '../../src/components/MarkdownView'
const fence='\x60\x60\x60'
const diagram=(source:string)=>fence+'mermaid\n'+source+'\n'+fence
createRoot(document.getElementById('root')!).render(<main>
 <section aria-label="Fluxograma"><MarkdownView markdown={diagram('flowchart LR\n A[Início] --> B[Fim]')}/></section>
 <section aria-label="Sequência"><MarkdownView markdown={diagram('sequenceDiagram\n participant A as Professor\n participant B as Aluno\n A->>B: Aula')}/></section>
 <section aria-label="Inválido"><MarkdownView markdown={diagram('unknown diagram type')}/></section>
 </main>)
