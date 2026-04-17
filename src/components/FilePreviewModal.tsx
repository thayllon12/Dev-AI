import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Copy } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { copyToClipboard } from "../lib/utils";
import { toast } from "sonner";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataUrl: string;
  mimeType: string;
  fileName?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  dataUrl,
  mimeType,
  fileName = "arquivo.txt",
}) => {
  const isImage = mimeType.startsWith("image/");
  const isAudio = mimeType.startsWith("audio/");
  const isVideo = mimeType.startsWith("video/");
  const isPdf = mimeType === "application/pdf";
  
  // Extract text from base64 dataUrl if it's a text file
  const getTextContent = () => {
    if (isImage || isAudio || isVideo || isPdf) return "";
    try {
      const base64 = dataUrl.split(",")[1];
      return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
      console.error("Error decoding text attachment:", e);
      return "Erro ao decodificar o arquivo.";
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    if (isImage) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        toast.success("Imagem copiada!");
      } catch (err) {
        console.error("Failed to copy image: ", err);
        toast.error("Erro ao copiar imagem. Tente fazer o download.");
      }
      return;
    }
    const text = getTextContent();
    await copyToClipboard(text);
    toast.success("Conteúdo copiado!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-[#1e1e1e] w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#252526]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium text-white">{fileName}</h2>
                <span className="text-xs px-2 py-1 bg-white/10 rounded-md text-white/70">
                  {mimeType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                  title="Copiar"
                >
                  <Copy size={18} />
                  <span className="text-sm hidden sm:inline">Copiar</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                  title="Baixar Arquivo"
                >
                  <Download size={18} />
                  <span className="text-sm hidden sm:inline">Download</span>
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button
                  onClick={onClose}
                  className="p-2 text-white/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e]">
              {isImage ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={dataUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : isAudio ? (
                <div className="w-full h-full flex items-center justify-center bg-[#252526] rounded-lg">
                  <audio controls src={dataUrl} className="w-full max-w-md" />
                </div>
              ) : isVideo ? (
                <div className="w-full h-full flex items-center justify-center bg-black rounded-lg">
                  <video controls src={dataUrl} className="max-w-full max-h-full rounded-lg" />
                </div>
              ) : isPdf ? (
                <div className="w-full h-full flex items-center justify-center bg-white rounded-lg overflow-hidden">
                  <iframe src={dataUrl} className="w-full h-full border-0" title={fileName} />
                </div>
              ) : (
                <div className="h-full">
                  <CodeBlock
                    language="text"
                    code={getTextContent()}
                    userSettings={{}}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
