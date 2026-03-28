import React, { useState, useEffect, useRef } from "react";
import { X, Play, Maximize2, ChevronUp, ChevronDown, Download, Copy, CheckCheck, File, ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";

export function FullscreenEditor({
  code,
  language,
  onClose,
}: {
  code: string;
  language: string;
  onClose: () => void;
}) {
  const [currentCode, setCurrentCode] = useState(code);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const keywords = ["function", "const", "let", "var", "return", "if", "else", "for", "while", "import", "export", "class", "interface", "type", "async", "await"];

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCurrentCode(value);
    
    const cursor = e.target.selectionStart;
    const textBefore = value.substring(0, cursor);
    const lastWord = textBefore.split(/\s+/).pop() || "";
    
    if (lastWord.length > 1) {
      const matches = keywords.filter(k => k.startsWith(lastWord) && k !== lastWord);
      setSuggestions(matches);
      
      if (textareaRef.current) {
        const { offsetLeft, offsetTop } = textareaRef.current;
        setSuggestionPos({ 
          top: offsetTop + 20, 
          left: offsetLeft + (lastWord.length * 8) 
        });
      }
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (s: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = currentCode.substring(0, cursor);
    const textAfter = currentCode.substring(cursor);
    const lastWord = textBefore.split(/\s+/).pop() || "";
    const newText = textBefore.substring(0, textBefore.length - lastWord.length) + s + textAfter;
    setCurrentCode(newText);
    setSuggestions([]);
    textareaRef.current.focus();
  };

  const lineNumbers = currentCode.split("\n").map((_, i) => i + 1).join("\n");

  return (
    <div className="fixed inset-0 bg-bg-main z-[100] flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-strong bg-bg-surface">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-sm font-mono text-text-muted uppercase tracking-widest">
            {language || "editor"} — {currentCode.length} chars
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(currentCode);
            }}
            className="p-2.5 bg-bg-surface-hover text-text-muted hover:text-primary rounded-xl transition-all border border-border-strong shadow-sm"
            title="Copiar Tudo"
          >
            <Copy size={20} />
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
      
      <div className="flex-1 flex overflow-hidden font-mono text-sm">
        <div className="w-12 bg-bg-surface border-r border-border-strong py-4 text-right pr-3 text-text-muted/30 select-none">
          <pre className="whitespace-pre-wrap">{lineNumbers}</pre>
        </div>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={currentCode}
            onChange={handleCodeChange}
            className="w-full h-full bg-transparent text-text-primary p-4 outline-none resize-none leading-6 custom-scrollbar overflow-y-auto"
            spellCheck={false}
          />
          
          {suggestions.length > 0 && (
            <div className="absolute bg-bg-surface border border-border-strong rounded-lg shadow-2xl p-1 z-50 min-w-[150px]"
                 style={{ 
                   top: suggestionPos.top,
                   left: suggestionPos.left 
                 }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(s)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-primary hover:text-white rounded transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="px-4 py-1.5 border-t border-border-strong bg-bg-surface flex items-center justify-between text-[10px] text-text-muted uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>{language || "Plain Text"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Linha {currentCode.substring(0, textareaRef.current?.selectionStart || 0).split("\n").length}</span>
          <span>Coluna {(textareaRef.current?.selectionStart || 0) - currentCode.lastIndexOf("\n", (textareaRef.current?.selectionStart || 0) - 1)}</span>
        </div>
      </div>
    </div>
  );
}
