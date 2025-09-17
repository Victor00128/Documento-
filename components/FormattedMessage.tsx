
import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { toastEvents } from '../utils/toast';

interface FormattedMessageProps {
  text: string;
}

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zM-1 7a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zM8 1.5A1.5 1.5 0 0 0 6.5 0h-3A1.5 1.5 0 0 0 2 1.5v1A1.5 1.5 0 0 0 3.5 4h3A1.5 1.5 0 0 0 8 2.5v-1z"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-green-400" viewBox="0 0 16 16">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
    </svg>
);

const CodeRenderer: NonNullable<Components['code']> = ({node, inline, className, children, ...props}) => {
    const [isCopied, setIsCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      navigator.clipboard.writeText(codeText).then(() => {
        toastEvents.dispatch('show', '¡Copiado al portapapeles!');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      }, (err) => {
        toastEvents.dispatch('show', 'Error al copiar');
        console.error('Could not copy text: ', err);
      });
    };
    
    return !inline && match ? (
      <div className="relative group bg-[#282c34] rounded-md my-2 overflow-x-auto">
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 bg-zinc-800/70 rounded-md text-zinc-300 hover:bg-zinc-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all duration-200 z-10"
            aria-label="Copy code to clipboard"
        >
            {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <SyntaxHighlighter
          style={atomDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ background: 'transparent', margin: '0', padding: '1rem' }}
        >
          {codeText}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className="px-1.5 py-1 bg-zinc-800/80 rounded-md text-red-400 font-mono text-sm" {...props}>
        {children}
      </code>
    );
};

const markdownComponents: Components = {
    code: CodeRenderer,
    h1: ({node, ...props}) => <h1 className="text-xl font-bold my-3" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-base font-bold my-2" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-outside my-2 pl-5" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-outside my-2 pl-5" {...props} />,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-zinc-500 pl-4 italic my-2 text-zinc-400" {...props} />,
    a: ({node, ...props}) => <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="table-auto w-full" {...props} /></div>,
    th: ({node, ...props}) => <th className="px-4 py-2 border border-zinc-600 bg-zinc-800" {...props} />,
    td: ({node, ...props}) => <td className="px-4 py-2 border border-zinc-600" {...props} />,
};

const FormattedMessage: React.FC<FormattedMessageProps> = ({ text }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default FormattedMessage;
