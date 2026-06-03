import React, { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Terminal, Copy, Check, Send, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { GoogleGenAI } from "@google/genai";

export function GameModal({
  code: initialCode,
  onClose,
  userSettings
}: {
  code: string;
  onClose: () => void;
  userSettings?: any;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentCode, setCurrentCode] = useState(initialCode);
  const [prompt, setPrompt] = useState("");
  const [isPatching, setIsPatching] = useState(false);
  const [logs, setLogs] = useState<{ id: number; level: string; message: string }[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [unreadErrors, setUnreadErrors] = useState(0);
  const [copiedLogId, setCopiedLogId] = useState<number | 'all' | null>(null);

  const handleCopy = (id: number | 'all', text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const injectedCode = React.useMemo(() => {
    const script = `
<script>
  (function() {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    function sendLog(level, args) {
      try {
        const message = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        window.parent.postMessage({ type: 'game-console', level, message }, '*');
      } catch (e) {}
    }

    console.error = function() {
      sendLog('error', arguments);
      originalConsoleError.apply(console, arguments);
    };
    console.warn = function() {
      sendLog('warn', arguments);
      originalConsoleWarn.apply(console, arguments);
    };
    console.log = function() {
      sendLog('log', arguments);
      originalConsoleLog.apply(console, arguments);
    };
    window.onerror = function(message, source, lineno, colno, error) {
      sendLog('error', [\`\${message} at \${source}:\${lineno}:\${colno}\`]);
      return false;
    };
    window.addEventListener('unhandledrejection', function(event) {
      sendLog('error', ['Unhandled Rejection:', event.reason]);
    });
  })();
</script>
`;
    return script + currentCode;
  }, [currentCode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'game-console') {
        const { level, message } = event.data;
        setLogs(prev => [...prev, { id: Date.now() + Math.random(), level, message }]);
        if (level === 'error' && !isConsoleOpen) {
          setUnreadErrors(prev => prev + 1);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isConsoleOpen]);

  useEffect(() => {
    if (isConsoleOpen) {
      setUnreadErrors(0);
    }
  }, [isConsoleOpen]);

  useEffect(() => {
    // Request fullscreen on mount (works usually since it's triggered from a click)
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onClose();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Push state so mobile back button exits the game
    window.history.pushState({ gameMode: true }, "");
    const handlePopState = () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      onClose();
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("popstate", handlePopState);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [onClose]);

  const reloadGame = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = injectedCode;
      setLogs([]);
      setUnreadErrors(0);
    }
  };

  const handlePatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isPatching || false) return;
    
    setIsPatching(true);
    try {
      const ai = new GoogleGenAI({ 
        apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY,
        httpOptions: { apiVersion: 'v1alpha' }
      });
      const numberedCode = currentCode.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Você é um assistente de edição de código especializado em pequenas correções, chamado Dev AI.
Aqui está o código atual com o número de linhas referenciado:
\`\`\`
${numberedCode}
\`\`\`

O usuário pediu: "${prompt}"

Retorne as alterações no formato JSON exato abaixo. A representação que você retornar deve substituir toda a sua resposta. Seja direto e retorne APENAS UM JSON.
[
  {
    "startLine": linha de início a ser substituída (1-indexado),
    "endLine": linha de fim a ser substituída (pode ser igual à startLine),
    "replacement": "novo trecho de código exato que as substituirá"
  }
]
Não inclua os números das linhas no atributo "replacement", apenas o código puro, formatado com as aspas normais, respeitando as indentações. O JSON deve ser um array válido.
Se você precisar substituir só a linha 5, coloque startLine: 5 e endLine: 5. 

RETORNE APENAS JSON LIMPO (SEM BLOCOS DE CÓDIGO \`\`\`json).`
      });

      let jsonStr = response.text || "";
      jsonStr = jsonStr.replace(/```json/gi, "").replace(/```/gi, "").trim();
      
      try {
        const patches = JSON.parse(jsonStr);
        let newLines = currentCode.split('\n');
        
        // Aplica os patches de trás pra frente (maior linha pra menor linha)
        patches.sort((a: any, b: any) => b.startLine - a.startLine);
        
        for (const patch of patches) {
           const startIdx = patch.startLine - 1;
           const endIdx = patch.endLine - 1;
           if (startIdx >= 0 && endIdx < newLines.length && startIdx <= endIdx) {
              const replacementLines = patch.replacement.split('\n');
              newLines.splice(startIdx, endIdx - startIdx + 1, ...replacementLines);
           }
        }
        setCurrentCode(newLines.join('\n'));
        setPrompt("");
        
        // Autoreload
        reloadGame();
      } catch (parseErr) {
         console.error("Falha ao analisar JSON:", parseErr, jsonStr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPatching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col animate-in zoom-in duration-300">
      {/* Floating Action Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10">
        <button
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className={cn(
            "p-2 rounded-xl transition-colors relative",
            isConsoleOpen ? "bg-white/20 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
          )}
          title="Console de Erros"
        >
          <Terminal size={18} />
          {unreadErrors > 0 && !isConsoleOpen && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadErrors > 9 ? '9+' : unreadErrors}
            </span>
          )}
        </button>
        <div className="w-px h-5 bg-white/20 mx-1" />
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

      {isConsoleOpen && (
        <div className="absolute top-20 right-4 w-[calc(100vw-32px)] sm:w-[450px] max-h-[70vh] bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between p-3 border-b border-white/10 bg-neutral-950/50">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-white/50" />
              <span className="text-white/80 text-sm font-semibold tracking-wide">Console do Jogo</span>
            </div>
            {logs.length > 0 && (
               <button
                  onClick={() => handleCopy('all', logs.map(l => l.message).join('\n'))}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                  title="Copiar todos os erros"
                >
                  {copiedLogId === 'all' ? <Check size={14} /> : <Copy size={14} />}
                </button>
            )}
          </div>
          <div className="overflow-y-auto p-2 flex-1 font-mono text-[11px] leading-relaxed flex flex-col gap-1 max-h-[60vh] custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-white/30 p-2 text-center">Nenhum log capturado.</div>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={cn(
                    "px-2 py-1.5 rounded-lg border flex flex-col gap-1 break-words relative group",
                    log.level === 'error' ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    log.level === 'warn' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                    "bg-white/5 border-transparent text-white/70"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="opacity-50 text-[10px] uppercase font-bold">{log.level}</span>
                    <button
                      onClick={() => handleCopy(log.id, log.message)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-current"
                      title="Copiar log"
                    >
                      {copiedLogId === log.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <span className="whitespace-pre-wrap">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Iframe */}
      <div className="flex-1 bg-white relative w-full h-full">
        <iframe
          ref={iframeRef}
          srcDoc={injectedCode}
          className="w-full h-full border-none"
          title="Game Preview"
          sandbox="allow-scripts allow-modals allow-popups allow-same-origin allow-pointer-lock"
        />
      </div>
    </div>
  );
}
