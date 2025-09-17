import React from 'react';

// --- Definiciones de los SVG ---
const FileTextIcon = (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const ImageIcon = (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
);

const PdfIcon = (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);

const ZipIcon = (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

// --- Lógica Declarativa ---
const ICON_MAP: Record<string, { component: React.FC<any>; color: string }> = {
  image: { component: ImageIcon, color: "text-purple-400" },
  pdf: { component: PdfIcon, color: "text-red-400" },
  zip: { component: ZipIcon, color: "text-yellow-400" },
  word: { component: FileTextIcon, color: "text-blue-500" },
  default: { component: FileTextIcon, color: "text-gray-400" },
};

// Función auxiliar para determinar el tipo de ícono a partir del MIME type.
const getIconTypeFromFile = (fileType: string): string => {
  if (fileType.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf') return 'pdf';
  if (fileType.includes('zip')) return 'zip';
  if (fileType.includes('msword') || fileType.includes('officedocument.wordprocessingml.document')) {
    return 'word';
  }
  return 'default';
};

interface FileIconProps {
  fileType: string;
}

/**
 * Componente reutilizable que renderiza el ícono correcto para un tipo de archivo dado.
 */
const FileIcon: React.FC<FileIconProps> = ({ fileType }) => {
  const iconKey = getIconTypeFromFile(fileType);
  const { component: IconComponent, color } = ICON_MAP[iconKey] || ICON_MAP.default;

  return <IconComponent className={`h-6 w-6 ${color}`} />;
};

export default FileIcon;