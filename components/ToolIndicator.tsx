import React from 'react';

interface ToolIndicatorProps {
  tool: string;
  query?: string;
}

const ToolIndicator: React.FC<ToolIndicatorProps> = ({ tool, query }) => {
  const getToolInfo = () => {
    switch (tool) {
      case 'internetSearch':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A5.987 5.987 0 0012 15a5.987 5.987 0 00-5.716 4.747M12 3a8.959 8.959 0 00-6.284 2.253" />
            </svg>
          ),
          text: `Buscando en internet: "${query}"...`,
          color: 'text-blue-400'
        };
      case 'getCurrentTime':
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          text: 'Consultando la hora actual...',
          color: 'text-green-400'
        };
      default:
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 animate-spin">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.992m0 0h-4.992m4.992 0-3.181-3.183a8.25 8.25 0 0 0-11.667 0L2.985 16.953" />
            </svg>
          ),
          text: `Ejecutando herramienta: ${tool}...`,
          color: 'text-purple-400'
        };
    }
  };

  const toolInfo = getToolInfo();

  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <div className={toolInfo.color}>
        {toolInfo.icon}
      </div>
      <span>{toolInfo.text}</span>
    </div>
  );
};

export default ToolIndicator;
