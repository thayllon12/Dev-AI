import React, { useState, useRef, useEffect } from "react";
import { 
  Menu, Folder, Edit2, MoreVertical, 
  Indent, Clipboard, Undo, Redo, Search, 
  ArrowLeft, ArrowRight, Save, Play, X,
  Share2, Code2, Paintbrush, AlignLeft,
  Check, Square, Lock, Send, Loader2,
  MessageSquare, Bot, User, Trash2
} from "lucide-react";
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import { cn } from "../lib/utils";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";

export function CanvasWorkspace({
  code,
  language = "lua",
  onClose,
  onChange,
  userSettings
}: {
  code: string;
  language?: string;
  onClose: () => void;
  onChange?: (val: string) => void;
  userSettings?: any;
}) {
  const editorRef = useRef<any>(null);
  const providerRef = useRef<any>(null);
  const docRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  
  // Cleanup CRDT on unmount
  React.useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      docRef.current?.destroy();
    };
  }, []);

  const monaco = useMonaco();
  const [activeTab, setActiveTab] = useState(2);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [minibar, setMinibar] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  
  const [currentCode, setCurrentCode] = useState(code);
  const [prompt, setPrompt] = useState("");
  const [isPatching, setIsPatching] = useState(false);

  type ChatMessage = { role: "user" | "model"; content: string };
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);
  
  const handleContextChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatting(true);

    try {
      const ai = new GoogleGenAI({ 
        apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY,
        httpOptions: { apiVersion: 'v1alpha' }
      });
      let historyStr = chatMessages.map(m => `${m.role === 'model' ? 'IA' : 'Usuário'}: ${m.content}`).join("\n\n");
      
      const res = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Você é um assistente de IA focado em ajudar o usuário com o código atual.
Aqui está o código completo do editor (apenas para contexto):
\`\`\`
${currentCode}
\`\`\`

Histórico da conversa:
${historyStr}
Usuário: ${userMessage.content}

Seja direto, prestativo e forneça exemplos de código caso necessário.`
      });

      if (res.text) {
        setChatMessages(prev => [...prev, { role: "model", content: res.text as string }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: "model", content: "Erro de conexão com a IA." }]);
    } finally {
      setIsChatting(false);
    }
  };
  
  const tabs = [
    { id: 1, name: "Dev Hub 🍷.txt" },
    { id: 2, name: "*sem título" },
    { id: 3, name: "sem título" }
  ];

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
        
        patches.sort((a: any, b: any) => b.startLine - a.startLine);
        
        for (const patch of patches) {
           const startIdx = patch.startLine - 1;
           const endIdx = patch.endLine - 1;
           if (startIdx >= 0 && endIdx < newLines.length && startIdx <= endIdx) {
              const replacementLines = patch.replacement.split('\n');
              newLines.splice(startIdx, endIdx - startIdx + 1, ...replacementLines);
           }
        }
        const updatedCode = newLines.join('\n');
        setCurrentCode(updatedCode);
        if (onChange) onChange(updatedCode);
        setPrompt("");
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
    <div className="w-full h-full flex flex-col bg-black text-white font-sans relative">
      {/* Top Navbar */}
      <div className="flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3 h-14 bg-black">
          <div className="flex items-center gap-5">
            <button className="text-gray-300 hover:text-white">
              <Menu size={24} />
            </button>
            <span className="text-[17px] font-normal text-white truncate">
              {tabs.find(t => t.id === activeTab)?.name.replace('*', '')}
            </span>
          </div>
          <div className="flex items-center gap-5 text-gray-300">
            <button className="hover:text-white"><Folder size={22} fill="currentColor" /></button>
            <button className="hover:text-white"><Edit2 size={22} /></button>
            <button className="hover:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <MoreVertical size={24} />
            </button>
          </div>
        </div>

        {/* Path Bar */}
        {activeTab === 1 && (
          <div className="px-14 text-[13px] text-gray-400 -mt-3 mb-2 font-mono">
            /storage/emulated/0/Delta...
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-end px-0 bg-black border-b-[2px] border-[#333]/50 shrink-0 overflow-x-auto no-scrollbar">
          <div className="w-1 h-6 bg-gray-500 rounded-sm ml-1 mr-2 mb-1.5 shrink-0" />
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-[15px] flex items-center justify-center cursor-pointer relative shrink-0",
                activeTab === tab.id ? "text-white" : "text-gray-400"
              )}
            >
              {tab.name}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-orange-500 translate-y-[2px]" />
              )}
              {activeTab !== tab.id && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-5 bg-[#333]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden relative bg-black">
        <Editor
          height="100%"
          language={language === 'html' ? 'html' : language === 'css' ? 'css' : language === 'javascript' || language === 'typescript' ? 'typescript' : language === 'luau' ? 'lua' : language}
          value={currentCode}
          onMount={(editor, monaco) => { 
            editorRef.current = editor; 
            
            editor.addAction({
              id: 'ask-ai-contextual',
              label: 'Conversar com a IA sobre o trecho',
              contextMenuGroupId: 'navigation',
              contextMenuOrder: 1.5,
              run: function(ed: any) {
                const selection = ed.getSelection();
                if (selection) {
                  const selectedText = ed.getModel().getValueInRange(selection);
                  if (selectedText.trim()) {
                    setIsChatOpen(true);
                    setChatInput(`Por favor, analise ou explique este trecho:\n\n\`\`\`\n${selectedText.trim()}\n\`\`\``);
                    setTimeout(() => {
                      document.getElementById('context-chat-input')?.focus();
                    }, 100);
                  }
                }
              }
            });
            
            // Setup Yjs WebRTC Provider for collaborative editing
            const ydoc = new Y.Doc();
            const type = ydoc.getText('monaco');
            const provider = new WebrtcProvider('dev-ai-workspace-collab', ydoc, {
              signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com']
            });
            const binding = new MonacoBinding(type, editor.getModel(), new Set([editor]), provider.awareness);
            
            docRef.current = ydoc;
            providerRef.current = provider;
            bindingRef.current = binding;
          }}
          onChange={(val) => {
            setCurrentCode(val || "");
            if (onChange) onChange(val || "");
          }}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            wordWrap: wordWrap ? "on" : "off",
            lineNumbers: "on",
            readOnly: readOnly,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            padding: { top: 0, bottom: 16 },
            wordBasedSuggestions: "currentDocument",
            formatOnPaste: true,
            formatOnType: true,
            suggest: {
              showIcons: false,
              showStatusBar: false,
              preview: true,
            },
            renderLineHighlight: 'none',
            matchBrackets: 'always',
            renderWhitespace: 'none',
            inlayHints: { enabled: "off" }
          }}
          className="w-full h-full outline-none"
        />

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#1a1a1a] border-l border-[#333] shadow-2xl flex flex-col z-40 transition-transform duration-300">
            <div className="flex items-center justify-between p-3 border-b border-[#333] shrink-0">
              <div className="flex items-center gap-2 text-white">
                <MessageSquare size={18} />
                <span className="font-medium text-sm">Chat Contextual AI</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-3 opacity-70">
                  <Bot size={40} />
                  <p className="text-center">Selecione um código, clique com o botão direito e escolha "Conversar com a IA" para analisar.</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
                      <span>{msg.role === "user" ? "Você" : "Dev AI"}</span>
                    </div>
                    <div className={cn("p-2.5 rounded-lg text-sm max-w-[90%] whitespace-pre-wrap break-words border", msg.role === "user" ? "bg-[#2d2d2d] border-[#444] text-white" : "bg-black border-orange-900/40 text-gray-200")}>
                       {msg.role === "model" ? (
                          <Markdown className="prose prose-invert prose-sm max-w-none prose-pre:bg-[#1a1a1a] prose-pre:border prose-pre:border-[#333] prose-pre:m-0" components={{
                            p: ({node, ...props}) => <p className="m-0" {...props} />
                          }}>
                             {msg.content}
                          </Markdown>
                       ) : msg.content}
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                   <Loader2 size={12} className="animate-spin" /> IA está analisando...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleContextChat} className="p-3 bg-[#111] border-t border-[#333] shrink-0">
              <div className="flex items-center gap-2 bg-[#222] border border-[#333] rounded p-1">
                <input
                  id="context-chat-input"
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  disabled={isChatting}
                  placeholder="Pergunte sobre o código..."
                  className="flex-1 bg-transparent px-2 py-1 outline-none text-sm text-white placeholder:text-gray-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={isChatting || !chatInput.trim()}
                  className="p-1.5 rounded bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Editor Bar */}
        <div className="bg-[#1e1e1e] border-t border-[#333] shrink-0 p-2 flex flex-col justify-center z-30">
          <form 
            onSubmit={handlePatchSubmit} 
            className="bg-black shadow-2xl rounded flex items-center gap-2 p-1 w-full border border-[#444]"
          >
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={isPatching || false}
              className="flex-1 bg-transparent text-white/90 px-3 py-1.5 outline-none text-sm placeholder:text-gray-500 disabled:opacity-50 font-sans"
              placeholder="IA: Modificar linha exata (ex: Altere a linha 10 para print('ola'))"
            />
            <button
              type="submit"
              disabled={isPatching || !prompt.trim() || false}
              className="p-2 rounded bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 transition-colors flex items-center justify-center shrink-0"
            >
              {isPatching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>

        {/* 3-Dot Menu Dropdown */}
        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
            <div className="absolute top-0 right-2 w-72 bg-[#2b2b2b] rounded-md shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 border border-[#444]/50">
              <button 
                className="w-full px-4 py-3.5 flex items-center gap-4 text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors"
                onClick={() => {
                  editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
                  setIsMenuOpen(false);
                }}
              >
                <Search size={22} /> Pesquisar / Substituir
              </button>
              <button className="w-full px-4 py-3.5 flex items-center gap-4 text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors">
                <Share2 size={22} /> Compartilhar
              </button>
              <button 
                className="w-full px-4 py-3.5 flex items-center gap-4 text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors"
                onClick={() => {
                  editorRef.current?.getAction('editor.action.formatDocument')?.run();
                  setIsMenuOpen(false);
                }}
              >
                <Indent size={22} className="rotate-180" /> Autoformatar
              </button>
              <button className="w-full px-4 py-3.5 flex items-center gap-4 text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors">
                <span className="font-bold text-xl w-[22px] flex justify-center text-gray-400">{`{}`}</span> Sintaxe
              </button>
              <button className="w-full px-4 py-3.5 flex items-center gap-4 text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors">
                <Play size={22} fill="currentColor" /> Executar
              </button>
              <div className="h-[1px] bg-[#444] my-2 mx-3" />
              <button 
                className="w-full px-4 py-3.5 flex items-center justify-between text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors"
                onClick={() => setMinibar(!minibar)}
              >
                <div className="flex items-center gap-4">
                  <span className="w-[22px] flex justify-center"><AlignLeft size={22} /></span> Minibarra de ferramentas
                </div>
                {minibar ? <div className="w-5 h-5 bg-orange-500 flex items-center justify-center rounded-[2px]"><Check size={16} strokeWidth={4} color="black" /></div> : <div className="w-5 h-5 border-2 border-gray-500 rounded-[2px]" />}
              </button>
              <button 
                className="w-full px-4 py-3.5 flex items-center justify-between text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors"
                onClick={() => setWordWrap(!wordWrap)}
              >
                <div className="flex items-center gap-4">
                  <span className="w-[22px] flex justify-center"><AlignLeft size={22} className="rotate-90" /></span> Quebra de Linhas
                </div>
                {wordWrap ? <div className="w-5 h-5 bg-orange-500 flex items-center justify-center rounded-[2px]"><Check size={16} strokeWidth={4} color="black" /></div> : <div className="w-5 h-5 border-2 border-gray-500 rounded-[2px]" />}
              </button>
              <button 
                className="w-full px-4 py-3.5 flex items-center justify-between text-[#e0e0e0] hover:bg-[#3d3d3d] text-[17px] transition-colors"
                onClick={() => setReadOnly(!readOnly)}
              >
                <div className="flex items-center gap-4">
                  <Lock size={22} /> Somente leitura
                </div>
                {readOnly ? <div className="w-5 h-5 bg-orange-500 flex items-center justify-center rounded-[2px]"><Check size={16} strokeWidth={4} color="black" /></div> : <div className="w-5 h-5 border-2 border-gray-500 rounded-[2px]" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom Toolbar */}
      {minibar && (
        <div className="flex items-center justify-between px-2 h-14 bg-black shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-5 px-3 text-gray-400">
            <button className="hover:text-white"><Indent size={22} /></button>
            <button className="hover:text-white"><Clipboard size={22} /></button>
            <button className="hover:text-white"><Undo size={22} /></button>
            <button className="hover:text-white"><Redo size={22} /></button>
            <button className="hover:text-white"><Search size={22} /></button>
            <button className="hover:text-white"><ArrowLeft size={22} /></button>
            <button className="hover:text-white"><ArrowRight size={22} /></button>
          </div>
          <div className="flex items-center gap-5 px-3 text-gray-400 ml-auto shrink-0">
            <button className="hover:text-white"><Save size={22} /></button>
            <button className="hover:text-white"><Play size={22} fill="currentColor" /></button>
            <button className="hover:text-white" onClick={onClose}><X size={26} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
