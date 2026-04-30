import React from "react";
import { X, RotateCcw } from "lucide-react";

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
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col animate-in zoom-in duration-300">
      {/* Floating Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
        <button
          onClick={reloadGame}
          className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
          title="Recarregar"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-red-500/80 rounded-xl transition-colors"
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Fullscreen Iframe */}
      <div className="flex-1 bg-white relative w-full h-full">
        <iframe
          ref={iframeRef}
          srcDoc={code}
          className="w-full h-full border-none"
          title="Game Preview"
          sandbox="allow-scripts allow-modals allow-popups allow-same-origin allow-pointer-lock"
        />
      </div>
    </div>
  );
}
