import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import {
  Copy,
  CheckCheck,
  ChevronUp,
  ChevronDown,
  Play,
  Maximize2,
  Download,
  File,
  ExternalLink,
  ShieldAlert,
  ArrowDown
} from "lucide-react";
import { copyToClipboard } from "../lib/utils";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

const lazyWithRetry = (componentImport: () => Promise<any>) => 
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });


const FullscreenEditor = lazyWithRetry(() => import("./FullscreenEditor").then(m => ({ default: m.FullscreenEditor })));
const GameModal = lazyWithRetry(() => import("./GameModal").then(m => ({ default: m.GameModal })));

export function CodeBlock({
  language,
  code,
  userSettings,
  fullMessageContent,
  onAnalyzeSecurity,
  onAskAI,
  isGenerating,
}: {
  language: string;
  code: string;
  userSettings: any;
  fullMessageContent?: string;
  onAnalyzeSecurity?: (code: string) => void;
  onAskAI?: (code: string) => void;
  isGenerating?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!!isGenerating);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConstrained, setIsConstrained] = useState(true);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "success">("idle");

  const codeContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const isLongCode = code.split("\n").length > 15;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollPositionRef.current = e.currentTarget.scrollTop;
  };

  const scrollToBottom = () => {
    if (codeContainerRef.current) {
      codeContainerRef.current.scrollTo({
        top: codeContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
      scrollPositionRef.current = codeContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isGenerating && codeContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = codeContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px tolerance
      
      if (isNearBottom) {
        // Use animation frame to ensure DOM has painted the new text
        requestAnimationFrame(() => {
          if (codeContainerRef.current) {
             codeContainerRef.current.scrollTo({
               top: codeContainerRef.current.scrollHeight,
               behavior: "auto" // smooth can lag behind fast generation
             });
          }
        });
      }
    }
  }, [code, isGenerating]);

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloadState("downloading");
    try {
      let useFallback = false;
      const suggestedName = `code_${Date.now()}.${language || "txt"}`;
      
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: 'Code file',
                accept: { 'text/plain': [`.${language || "txt"}`] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(code);
          await writable.close();
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setDownloadState("idle");
            return; // User cancelled
          }
          console.warn("showSaveFilePicker failed, using fallback:", err);
          useFallback = true;
        }
      } else {
        useFallback = true;
      }

      if (useFallback) {
        const blob = new Blob([code], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        // Important: Needs to be in DOM for some iframe config downloads to work
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setDownloadState("success");
      setTimeout(() => setDownloadState("idle"), 1500);

    } catch (err) {
      console.error("Failed to save file", err);
      setDownloadState("idle");
    }
  };

  return (
    <>
      <Suspense fallback={null}>
        {isPlaying && (
          <GameModal code={code} onClose={() => setIsPlaying(false)} userSettings={userSettings} />
        )}
        {isFullscreen && (
          <FullscreenEditor
            code={code}
            language={language}
            onClose={() => setIsFullscreen(false)}
            fullMessageContent={fullMessageContent}
            onAskAI={onAskAI}
            userSettings={userSettings}
          />
        )}
      </Suspense>
      <div className="my-4 rounded-xl overflow-hidden bg-bg-code border border-border-strong w-full max-w-full min-w-0">
        <div className="flex items-center justify-between px-4 py-2 bg-bg-code-header text-text-muted text-xs font-sans overflow-x-auto whitespace-nowrap custom-scrollbar gap-4">
          <div className="flex items-center gap-3">
            <span className="uppercase font-semibold">{language || "text"}</span>
            <span className="text-[10px] opacity-50">
              {code.split("\n").length} linhas
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {language === "html" && (
              <button
                onClick={() => setIsPlaying(true)}
                className="flex items-center gap-1.5 hover:text-green-400 transition-colors text-green-500 font-bold"
              >
                <Play size={14} />
                Preview / Jogar
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              <Maximize2 size={14} />
              Tela Cheia
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isExpanded ? "Minimizar" : "Expandir"}
            </button>
            {onAnalyzeSecurity && (
              <button
                onClick={() => onAnalyzeSecurity(code)}
                className="flex items-center gap-1.5 hover:text-red-400 transition-colors text-red-500 font-bold"
                title="Analisar Segurança"
              >
                <ShieldAlert size={14} />
                Analisar
              </button>
            )}
            <button
              onClick={handleDownload}
              className={`flex items-center gap-1.5 transition-colors ${
                downloadState === 'success' ? 'text-green-500 font-bold' : 
                downloadState === 'downloading' ? 'text-yellow-500 font-bold' : 
                'hover:text-text-primary text-text-muted'
              }`}
            >
              {downloadState === 'success' ? <CheckCheck size={14} /> : <Download size={14} />}
              {downloadState === 'success' ? 'Baixando...' : 
               downloadState === 'downloading' ? 'Baixando...' : 'Download'}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              {copied ? (
                <CheckCheck size={14} className="text-emerald-500" />
              ) : (
                <Copy size={14} />
              )}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="relative group">
            <div 
              ref={codeContainerRef}
              onScroll={handleScroll}
              className={`p-4 overflow-x-auto overscroll-contain text-[13px] font-mono custom-scrollbar ${isConstrained && isLongCode ? 'max-h-[600px] overflow-y-auto' : ''}`}
            >
              {code.length > 500000 ? (
                 <pre className="m-0 p-0 bg-transparent text-[#d4d4d4] font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words overflow-x-auto" style={{ tabSize: 2 }}>
                   <code>{code}</code>
                 </pre>
              ) : (
                <SyntaxHighlighter
                   language={language === "luau" ? "lua" : language}
                   style={vscDarkPlus}
                   customStyle={{ margin: 0, padding: 0, background: "transparent" }}
                   wrapLines={true}
                   wrapLongLines={true}
                   showLineNumbers={true}
                   lineNumberStyle={{
                     minWidth: "2.5em",
                     paddingRight: "1em",
                     color: "rgba(255,255,255,0.3)",
                     textAlign: "right",
                     userSelect: "none"
                   }}
                 >
                   {code}
                </SyntaxHighlighter>
              )}
            </div>
            
            {isConstrained && isLongCode && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 bg-bg-surface border border-border-strong text-text-muted hover:text-primary p-2.5 rounded-xl shadow-xl opacity-20 hover:opacity-100 transition-opacity z-10"
                title="Rolar para o final do bloco"
              >
                <ArrowDown size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
