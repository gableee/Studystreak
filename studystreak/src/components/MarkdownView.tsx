import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  markdown: string;
  className?: string;
}

export default function MarkdownView({ markdown, className = '' }: MarkdownViewProps) {
  return (
    <div
      className={`prose prose-slate dark:prose-invert max-w-none leading-7 prose-p:my-2 prose-li:my-1 prose-headings:scroll-mt-20 ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
