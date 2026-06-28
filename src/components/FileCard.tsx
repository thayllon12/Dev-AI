import React from 'react';
import { Download, File, Copy, FileText, Code2, Image, FileArchive } from 'lucide-react';
import { motion } from 'motion/react';
import { copyToClipboard } from '../lib/utils';
import { toast } from 'sonner';

interface FileCardProps {
  name: string;
  size: string;
  mimeType: string;
  downloadUrl: string;
  content?: string; // Para arquivos texto que podem ser copiados
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('image')) return Image;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive;
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('html') || mimeType.includes('css')) return Code2;
  if (mimeType.includes('text') || mimeType.includes('csv') || mimeType.includes('markdown')) return FileText;
  return File;
};

export const FileCard: React.FC<FileCardProps> = ({ name, size, mimeType, downloadUrl, content }) => {
  const Icon = getFileIcon(mimeType);

  const handleCopy = () => {
    if (content) {
      copyToClipboard(content);
      toast.success('Conteúdo copiado para a área de transferência');
    }
  };

  const handleDownload = () => {
    // Inicia o download programaticamente
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="bg-bg-surface-hover border border-border-default rounded-xl p-4 flex flex-col gap-3 my-2 shadow-sm max-w-[320px]"
    >
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-lg text-primary">
          <Icon size={24} />
        </div>
        <div className="flex flex-col flex-1 truncate">
          <span className="font-medium text-text-default truncate" title={name}>
            {name}
          </span>
          <span className="text-xs text-text-muted mt-0.5">
            {size} • Criado agora
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-fixed font-medium py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          <Download size={16} />
          Baixar
        </button>
        {content && (
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 bg-bg-surface text-text-default font-medium py-2 px-3 border border-border-default rounded-lg text-sm hover:bg-bg-subtle transition-colors"
            title="Copiar Conteúdo"
          >
            <Copy size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
