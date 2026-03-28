import React from "react";
import { X, Play, RotateCcw } from "lucide-react";

export function GameModal({
  code,
  onClose,
}: {
  code: string;
  onClose: () => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const reloadGame = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col animate-in zoom-in duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
            <Play size={18} />
          </div>
          <h3 className="font-bold text-white">Visualização de Jogo / HTML</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadGame}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Recarregar"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg hover:scale-110 active:scale-95"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white relative">
        <iframe
          ref={iframeRef}
          srcDoc={code}
          className="w-full h-full border-none"
          title="Game Preview"
          sandbox="allow-scripts allow-modals allow-popups"
        />
      </div>
      <div className="p-2 bg-zinc-900 text-[10px] text-white/40 text-center uppercase tracking-widest">
        Executando em ambiente seguro (Sandbox)
      </div>
    </div>
  );
}
