import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MermaidDiagram } from './MermaidDiagram'

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ children, className, ...props }) {
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
