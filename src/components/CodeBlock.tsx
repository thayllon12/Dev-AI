import React, { useState } from "react";
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
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FullscreenEditor } from "./FullscreenEditor";
import { GameModal } from "./GameModal";

export function CodeBlock({
  language,
  code,
  userSettings,
}: {
  language: string;
  code: string;
  userSettings: any;
}) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (userSettings?.fullscreenEditor) {
    return (
      <>
        {isFullscreen && (
          <FullscreenEditor
            code={code}
            language={language}
            onClose={() => setIsFullscreen(false)}
          />
        )}
        <div
          className="my-2 flex items-center gap-3 p-3 bg-bg-surface border border-border-strong rounded-xl hover:bg-bg-surface-hover transition-all cursor-pointer group"
          onClick={() => setIsFullscreen(true)}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <File size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate uppercase">
              {language || "arquivo"}
            </div>
            <div className="text-xs text-text-muted">
              Clique para abrir o código
            </div>
          </div>
          <button className="p-2 text-text-muted hover:text-primary transition-colors">
            <ExternalLink size={18} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {isPlaying && (
        <GameModal code={code} onClose={() => setIsPlaying(false)} />
      )}
      {isFullscreen && (
        <FullscreenEditor
          code={code}
          language={language}
          onClose={() => setIsFullscreen(false)}
        />
      )}
      <div className="my-4 rounded-xl overflow-hidden bg-bg-code border border-border-strong">
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
                Jogar
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
            <button
              onClick={() => {
                const blob = new Blob([code], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `code_${Date.now()}.${language || "txt"}`;
                a.click();
              }}
              className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
            >
              <Download size={14} />
              Download
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
          <div className="p-4 overflow-x-auto text-[13px] font-mono custom-scrollbar relative">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: 0, background: "transparent" }}
              wrapLines={true}
              showLineNumbers={true}
              lineNumberStyle={{
                minWidth: "2.5em",
                paddingRight: "1em",
                color: "rgba(255,255,255,0.3)",
                textAlign: "right",
                userSelect: "none",
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </>
  );
}
