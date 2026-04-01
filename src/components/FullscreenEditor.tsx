import React, { useState, useEffect, useRef } from "react";
import { X, Play, Maximize2, ChevronUp, ChevronDown, Download, Copy, CheckCheck, File, ExternalLink, Plus, Trash2, Edit2, FileCode } from "lucide-react";
import { cn, copyToClipboard } from "../lib/utils";
import { GameModal } from "./GameModal";

interface EditorFile {
  id: string;
  name: string;
  content: string;
  language: string;
}

export function FullscreenEditor({
  code,
  language,
  onClose,
  fullMessageContent,
}: {
  code: string;
  language: string;
  onClose: () => void;
  fullMessageContent?: string;
}) {
  const [files, setFiles] = useState<EditorFile[]>(() => {
    if (fullMessageContent) {
      const codeBlocks: EditorFile[] = [];
      const regex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;
      let idCounter = 1;
      while ((match = regex.exec(fullMessageContent)) !== null) {
        const lang = match[1] || 'plaintext';
        const content = match[2].trim();
        const ext = lang === 'javascript' ? 'js' : lang === 'html' ? 'html' : lang === 'css' ? 'css' : lang === 'python' ? 'py' : lang === 'typescript' ? 'ts' : 'txt';
        codeBlocks.push({
          id: idCounter.toString(),
          name: `file${idCounter}.${ext}`,
          content: content,
          language: lang
        });
        idCounter++;
      }
      if (codeBlocks.length > 0) {
        return codeBlocks;
      }
    }
    return [
      {
        id: "1",
        name: `main.${language === 'javascript' ? 'js' : language === 'html' ? 'html' : language === 'css' ? 'css' : language === 'python' ? 'py' : language === 'typescript' ? 'ts' : 'txt'}`,
        content: code,
        language: language
      }
    ];
  });
  
  const initialActiveFile = files.find(f => f.content === code) || files[0];
  const [activeFileId, setActiveFileId] = useState(initialActiveFile.id);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const keywords = ["function", "const", "let", "var", "return", "if", "else", "for", "while", "import", "export", "class", "interface", "type", "async", "await"];

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: value } : f));
    
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
    const textBefore = activeFile.content.substring(0, cursor);
    const textAfter = activeFile.content.substring(cursor);
    const lastWord = textBefore.split(/\s+/).pop() || "";
    const newText = textBefore.substring(0, textBefore.length - lastWord.length) + s + textAfter;
    
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: newText } : f));
    setSuggestions([]);
    textareaRef.current.focus();
  };

  const createNewFile = () => {
    const newId = Date.now().toString();
    setFiles(prev => [...prev, {
      id: newId,
      name: `newFile${prev.length + 1}.js`,
      content: "",
      language: "javascript"
    }]);
    setActiveFileId(newId);
    setEditingFileId(newId);
  };

  const deleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length === 1) return; // Don't delete last file
    
    const newFiles = files.filter(f => f.id !== id);
    setFiles(newFiles);
    if (activeFileId === id) {
      setActiveFileId(newFiles[0].id);
    }
  };

  const renameFile = (id: string, newName: string) => {
    let lang = "plaintext";
    if (newName.endsWith(".js")) lang = "javascript";
    else if (newName.endsWith(".html")) lang = "html";
    else if (newName.endsWith(".css")) lang = "css";
    else if (newName.endsWith(".py")) lang = "python";
    else if (newName.endsWith(".ts") || newName.endsWith(".tsx")) lang = "typescript";
    else if (newName.endsWith(".json")) lang = "json";
    
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName, language: lang } : f));
    setEditingFileId(null);
  };

  const getCombinedCode = () => {
    const htmlFile = files.find(f => f.language === 'html');
    const cssFiles = files.filter(f => f.language === 'css');
    const jsFiles = files.filter(f => f.language === 'javascript' || f.language === 'typescript');

    let combinedHtml = htmlFile ? htmlFile.content : '<div id="root"></div>';

    // Inject CSS
    if (cssFiles.length > 0) {
      const cssContent = cssFiles.map(f => f.content).join('\n');
      if (combinedHtml.includes('</head>')) {
        combinedHtml = combinedHtml.replace('</head>', `<style>\n${cssContent}\n</style>\n</head>`);
      } else {
        combinedHtml = `<style>\n${cssContent}\n</style>\n` + combinedHtml;
      }
    }

    // Inject JS
    if (jsFiles.length > 0) {
      const jsContent = jsFiles.map(f => f.content).join('\n');
      if (combinedHtml.includes('</body>')) {
        combinedHtml = combinedHtml.replace('</body>', `<script>\n${jsContent}\n</script>\n</body>`);
      } else {
        combinedHtml += `\n<script>\n${jsContent}\n</script>`;
      }
    }

    return combinedHtml;
  };

  const lineNumbers = activeFile.content.split("\n").map((_, i) => i + 1).join("\n");

  return (
    <div className="fixed inset-0 bg-bg-main z-[9999] flex flex-col animate-in fade-in duration-200">
      {isPlaying && (
        <GameModal code={getCombinedCode()} onClose={() => setIsPlaying(false)} />
      )}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border-strong bg-bg-surface flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="sm:ml-4 text-xs sm:text-sm font-mono text-text-muted uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
            Dev AI Pro Editor
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsPlaying(true)}
            className="p-2 sm:p-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all border border-green-500/20 shadow-sm flex items-center gap-2"
            title="Executar Projeto"
          >
            <Play size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline font-bold text-sm">Executar</span>
          </button>
          <button
            onClick={() => {
              copyToClipboard(activeFile.content);
            }}
            className="p-2 sm:p-2.5 bg-bg-surface-hover text-text-muted hover:text-primary rounded-xl transition-all border border-border-strong shadow-sm"
            title="Copiar Arquivo Atual"
          >
            <Copy size={18} className="sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg hover:scale-110 active:scale-95"
            title="Fechar"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 sm:w-64 bg-bg-surface border-r border-border-strong flex flex-col">
          <div className="p-3 border-b border-border-strong flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Arquivos</span>
            <button 
              onClick={createNewFile}
              className="p-1 hover:bg-bg-surface-hover rounded text-text-muted hover:text-primary transition-colors"
              title="Novo Arquivo"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-colors",
                  activeFileId === file.id ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-bg-surface-hover hover:text-text-primary"
                )}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileCode size={14} className="shrink-0" />
                  {editingFileId === file.id ? (
                    <input
                      autoFocus
                      defaultValue={file.name}
                      onBlur={(e) => renameFile(file.id, e.target.value || file.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameFile(file.id, e.currentTarget.value || file.name);
                        if (e.key === 'Escape') setEditingFileId(null);
                      }}
                      className="bg-bg-main text-text-primary text-sm px-1 py-0.5 rounded outline-none border border-primary/50 w-full"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm truncate">{file.name}</span>
                  )}
                </div>
                
                <div className={cn(
                  "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                  activeFileId === file.id && "opacity-100"
                )}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFileId(file.id);
                    }}
                    className="p-1 hover:bg-black/10 rounded text-text-muted hover:text-primary"
                  >
                    <Edit2 size={12} />
                  </button>
                  {files.length > 1 && (
                    <button 
                      onClick={(e) => deleteFile(file.id, e)}
                      className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden font-mono text-sm bg-bg-main">
          <div 
            ref={lineNumbersRef}
            className="w-12 bg-bg-surface border-r border-border-strong py-4 text-right pr-3 text-text-muted/30 select-none overflow-hidden"
          >
            <pre className="whitespace-pre-wrap leading-6 m-0">{lineNumbers}</pre>
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={activeFile.content}
              onChange={handleCodeChange}
              onScroll={handleScroll}
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
      </div>
      
      <div className="px-4 py-1.5 border-t border-border-strong bg-bg-surface flex items-center justify-between text-[10px] text-text-muted uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>{activeFile.language || "Plain Text"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Linha {activeFile.content.substring(0, textareaRef.current?.selectionStart || 0).split("\n").length}</span>
          <span>Coluna {(textareaRef.current?.selectionStart || 0) - activeFile.content.lastIndexOf("\n", (textareaRef.current?.selectionStart || 0) - 1)}</span>
        </div>
      </div>
    </div>
  );
}
