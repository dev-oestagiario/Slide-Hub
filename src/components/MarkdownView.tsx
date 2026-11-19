import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { SlideShape } from '../features/editor/SlideShape'
import { MermaidDiagram } from './MermaidDiagram'

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ children, className, ...props }) {
          if (className==='language-slide-shape') return <SlideShape value={String(children)}/>
          if (className?.includes('language-mermaid')) {
            return <MermaidDiagram source={String(children).trim()} />
          }
          return <code className={className} {...props}>{children}</code>
        }
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
