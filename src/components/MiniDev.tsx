import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Mic, MicOff, MessageSquare, PictureInPicture } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

interface MiniDevProps {
  onClose: () => void;
  isListening: boolean;
  onListenToggle: () => void;
  isGenerating: boolean;
  statusMessage: string | null;
}

export function MiniDev({ onClose, isListening, onListenToggle, isGenerating, statusMessage }: MiniDevProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto expand when generating
  useEffect(() => {
    if (isGenerating) setIsExpanded(true);
  }, [isGenerating]);

  const handlePiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      toast.error("O recurso Picture-in-Picture não é suportado pelo seu navegador atual. Use o Chrome ou o Edge no Computador.");
      return;
    }

    try {
      // @ts-ignore
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 300,
        height: 400,
      });

      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.style.backgroundColor = "#0e1116"; // match theme
      
      const pipContainer = pipWindow.document.createElement('div');
      pipContainer.id = "pip-root";
      pipWindow.document.body.append(pipContainer);

      // We instruct the user how to deal with this, technically rendering React inside Pip is complex 
      // without portals, so we'll just show a simplified UI in pure JS for the PIP or a Toast info
      pipContainer.innerHTML = `
        <div style="color: white; font-family: sans-serif; padding: 20px; text-align: center;">
          <h2>Dev AI - Modo PiP</h2>
          <p>O App está acompanhando sua tela no fundo.</p>
          <p style="color: #4ade80;">Conexão ativa.</p>
        </div>
      `;

      pipWindow.addEventListener("pagehide", (event: any) => {
        // Pip closed
      });
      
      toast.success("O mini player foi aberto sobre a tela!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao tentar abrir no modo Janela Flutuante.");
    }
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragConstraints={{ left: 0, top: 0, right: window.innerWidth - 300, bottom: window.innerHeight - 100 }}
      dragElastic={0.1}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 50 }}
      className="fixed z-[9999] bottom-20 right-8 flex flex-col items-end gap-2"
      style={{ touchAction: 'none' }}
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.8 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.8 }}
            className="w-64 bg-bg-surface border border-primary/30 rounded-2xl shadow-2xl p-4 overflow-hidden backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-primary" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-widest">Dev AI</span>
              </div>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
                title="Minimizar (apenas no modo floating)"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="text-sm text-text-secondary min-h-[40px] flex items-center justify-center text-center">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-2 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-xs">{statusMessage || "Pensando..."}</span>
                </div>
              ) : isListening ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>
                  <span className="text-xs text-red-400">Ouvindo... Fale algo!</span>
                </div>
              ) : (
                <span className="text-xs italic">Estou de olho na sua tela. Fale comigo!</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={handlePiP}
          title="Destacar para fora do Navegador (Picture-in-Picture)"
          className="w-10 h-10 bg-bg-surface hover:bg-bg-surface-hover border border-border-strong rounded-full shadow-lg flex items-center justify-center text-text-muted hover:text-primary transition-all relative group"
        >
          <PictureInPicture size={18} />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-12 h-12 bg-bg-surface hover:bg-bg-surface-hover border border-border-strong rounded-full shadow-lg flex items-center justify-center text-text-primary transition-all relative group"
        >
          <MessageSquare size={20} />
          {isGenerating && <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full animate-ping" />}
        </button>
        
        <button
          onClick={onListenToggle}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all border-2",
            isListening 
              ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" 
              : "bg-primary border-transparent text-white hover:bg-primary-hover hover:scale-105"
          )}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
      </div>
    </motion.div>
  );
}
