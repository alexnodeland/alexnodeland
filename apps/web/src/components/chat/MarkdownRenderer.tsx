import 'highlight.js/styles/github-dark.css';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
}) => {
  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for better styling
          h1: ({ node: _node, ...props }) => (
            <h1 className="markdown-h1" {...props} />
          ),
          h2: ({ node: _node, ...props }) => (
            <h2 className="markdown-h2" {...props} />
          ),
          h3: ({ node: _node, ...props }) => (
            <h3 className="markdown-h3" {...props} />
          ),
          h4: ({ node: _node, ...props }) => (
            <h4 className="markdown-h4" {...props} />
          ),
          h5: ({ node: _node, ...props }) => (
            <h5 className="markdown-h5" {...props} />
          ),
          h6: ({ node: _node, ...props }) => (
            <h6 className="markdown-h6" {...props} />
          ),
          p: ({ node: _node, ...props }) => (
            <p className="markdown-p" {...props} />
          ),
          ul: ({ node: _node, ...props }) => (
            <ul className="markdown-ul" {...props} />
          ),
          ol: ({ node: _node, ...props }) => (
            <ol className="markdown-ol" {...props} />
          ),
          li: ({ node: _node, ...props }) => (
            <li className="markdown-li" {...props} />
          ),
          blockquote: ({ node: _node, ...props }) => (
            <blockquote className="markdown-blockquote" {...props} />
          ),
          code: ({ node: _node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
              <code className={`markdown-code-block ${className}`} {...props}>
                {children}
              </code>
            ) : (
              <code className="markdown-code-inline" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node: _node, ...props }) => (
            <pre className="markdown-pre" {...props} />
          ),
          a: ({ node: _node, ...props }) => (
            <a className="markdown-link" {...props} />
          ),
          strong: ({ node: _node, ...props }) => (
            <strong className="markdown-strong" {...props} />
          ),
          em: ({ node: _node, ...props }) => (
            <em className="markdown-em" {...props} />
          ),
          table: ({ node: _node, ...props }) => (
            <table className="markdown-table" {...props} />
          ),
          thead: ({ node: _node, ...props }) => (
            <thead className="markdown-thead" {...props} />
          ),
          tbody: ({ node: _node, ...props }) => (
            <tbody className="markdown-tbody" {...props} />
          ),
          tr: ({ node: _node, ...props }) => (
            <tr className="markdown-tr" {...props} />
          ),
          th: ({ node: _node, ...props }) => (
            <th className="markdown-th" {...props} />
          ),
          td: ({ node: _node, ...props }) => (
            <td className="markdown-td" {...props} />
          ),
          hr: ({ node: _node, ...props }) => (
            <hr className="markdown-hr" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
