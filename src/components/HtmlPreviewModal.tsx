import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, RefreshCw, Terminal, Maximize2, Minimize2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
}

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({ isOpen, onClose, code }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setLogs([]);
      setKey(k => k + 1);
      
      // Manejar botão de voltar do celular
      window.history.pushState({ htmlPreviewOpen: true }, '', window.location.href);
      const handlePopState = (e: PopStateEvent) => {
        onClose();
      };
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        // Se ainda estamos montados, devemos dar um popstate para não quebrar a navegação se fecharmos no botão
      };
    }
  }, [isOpen, code, onClose]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CONSOLE_LOG') {
        setLogs(prev => [...prev, { type: event.data.level, message: event.data.args.join(' ') }]);
      } else if (event.data?.type === 'CONSOLE_ERROR') {
        setLogs(prev => [...prev, { type: 'error', message: event.data.message }]);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleReload = () => {
    setLogs([]);
    setKey(k => k + 1);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const getHtmlWithConsoleHook = () => {
    const hookScript = `
      <script>
        (function() {
          const originalConsoleLog = console.log;
          const originalConsoleError = console.error;
          const originalConsoleWarn = console.warn;
          const originalConsoleInfo = console.info;

          console.log = function(...args) {
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'log', args: args.map(String) }, '*');
            originalConsoleLog.apply(console, args);
          };
          console.error = function(...args) {
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'error', args: args.map(String) }, '*');
            originalConsoleError.apply(console, args);
          };
          console.warn = function(...args) {
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'warn', args: args.map(String) }, '*');
            originalConsoleWarn.apply(console, args);
          };
          console.info = function(...args) {
            window.parent.postMessage({ type: 'CONSOLE_LOG', level: 'info', args: args.map(String) }, '*');
            originalConsoleInfo.apply(console, args);
          };
          window.onerror = function(message, source, lineno, colno, error) {
            window.parent.postMessage({ type: 'CONSOLE_ERROR', message: message + " at line " + lineno }, '*');
            return false;
          };
        })();
      </script>
    `;
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${hookScript}
  </head>
  <body>
    ${code.replace(/<!DOCTYPE html>/i, '').replace(/<html>/i, '').replace(/<\/html>/i, '')}
  </body>
</html>`;
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex flex-col bg-white"
        >
          <div 
            ref={containerRef}
            className="w-full h-full flex flex-col bg-white overflow-hidden relative"
          >
            {/* Header / Actions Menu */}
            <div className="flex-none bg-[#1e1e1e] p-2 flex items-center justify-between z-10 text-white">
               <div className="flex items-center gap-2 px-2">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500" />
                   <div className="w-3 h-3 rounded-full bg-yellow-500" />
                   <div className="w-3 h-3 rounded-full bg-green-500" />
                 </div>
                 <span className="text-white/70 text-xs font-mono ml-4 truncate max-w-[150px] sm:max-w-[300px]">HTML Live Preview</span>
               </div>
               
               <div className="flex items-center gap-2 text-white/80">
                 <button onClick={handleReload} className="p-2 rounded hover:bg-white/10 transition-colors" title="Recarregar (Reload)">
                   <RefreshCw size={16} />
                 </button>
                 <button onClick={() => setShowConsole(!showConsole)} className={`p-2 rounded transition-colors ${showConsole ? 'bg-primary/30 text-primary' : 'hover:bg-white/10'}`} title="Console">
                   <Terminal size={16} />
                 </button>
                 <button onClick={toggleFullscreen} className="p-2 hidden sm:block rounded hover:bg-white/10 transition-colors" title="Tela Cheia">
                   {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                 </button>
                 <div className="w-px h-6 bg-white/20 mx-1" />
                 <button onClick={() => { 
                    if(isFullscreen) document.exitFullscreen(); 
                    if (window.history.state?.htmlPreviewOpen) window.history.back();
                    onClose(); 
                 }} className="p-2 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Fechar">
                   <X size={16} />
                 </button>
               </div>
            </div>

            {/* Iframe content */}
            <iframe
              key={key}
              ref={iframeRef}
              srcDoc={getHtmlWithConsoleHook()}
              className="w-full flex-1 border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />

            {/* Console Drawer */}
            <AnimatePresence>
              {showConsole && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 250 }}
                  exit={{ height: 0 }}
                  className="bg-[#1e1e1e] border-t border-white/10 overflow-hidden flex flex-col z-20"
                >
                  <div className="flex items-center justify-between p-2 bg-[#252526] border-b border-white/10">
                    <div className="flex items-center gap-2 px-2 text-white/80 text-xs font-mono">
                      <Terminal size={14} /> Console
                    </div>
                    <button onClick={() => setLogs([])} className="text-xs text-white/50 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">
                      Limpar
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto p-2 font-mono text-xs">
                    {logs.length === 0 ? (
                      <div className="text-white/30 p-2 italic">Aguardando logs...</div>
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className={`p-1 border-b border-white/5 ${
                          log.type === 'error' ? 'text-red-400 bg-red-400/5' :
                          log.type === 'warn' ? 'text-yellow-400 bg-yellow-400/5' :
                          log.type === 'info' ? 'text-blue-400' : 'text-white/80'
                        }`}>
                          <span className="opacity-50 mr-2">[{log.type}]</span>
                          {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
