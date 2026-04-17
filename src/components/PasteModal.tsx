import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Type, X } from "lucide-react";

interface PasteModalProps {
  text: string;
  onClose: () => void;
  onPasteAsFile: (text: string) => void;
  onPasteInInput: (text: string) => void;
}

export const PasteModal: React.FC<PasteModalProps> = ({
  text,
  onClose,
  onPasteAsFile,
  onPasteInInput,
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-bg-surface w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-border-subtle"
        >
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <h2 className="text-lg font-semibold text-text-primary">Texto Grande Detectado</h2>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-sm text-text-secondary">
              Você colou um texto longo ({text.length} caracteres). Como deseja inseri-lo?
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => onPasteAsFile(text)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle hover:bg-bg-surface-hover transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="font-medium text-text-primary">Colar como Arquivo</div>
                  <div className="text-xs text-text-secondary">Cria um anexo .txt</div>
                </div>
              </button>

              <button
                onClick={() => onPasteInInput(text)}
                className="flex items-center gap-3 p-3 rounded-xl border border-border-subtle hover:bg-bg-surface-hover transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-bg-base flex items-center justify-center text-text-secondary shrink-0">
                  <Type size={20} />
                </div>
                <div>
                  <div className="font-medium text-text-primary">Colar no Input</div>
                  <div className="text-xs text-text-secondary">Insere diretamente na caixa de texto</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
