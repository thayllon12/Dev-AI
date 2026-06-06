import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Copy, CheckCheck, RotateCcw, Edit2, Code2, Download, ExternalLink, MoreVertical, Volume2, VolumeX, X, SplitSquareHorizontal, Brain, ChevronDown, ChevronUp, Archive, Maximize2, Image as ImageIcon, Play } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { useClickOutside } from "../hooks/useClickOutside";
import { FilePreviewModal } from "./FilePreviewModal";
import { AILogo } from "./AILogo";
import { copyToClipboard, guessLanguage } from "../lib/utils";
import { FileText } from "lucide-react";
import JSZip from "jszip";

interface MessageBubbleProps {
  msg: any;
  isCodeMode: boolean;
  userPhoto?: string | null;
  onRegenerate?: (msg: any) => void;
  onContinue?: (msg: any) => void;
  isLastMessage?: boolean;
  onEdit?: (msg: any) => void;
  onBranch?: (msg: any) => void;
  userSettings: any;
  onAnalyzeSecurity?: (code: string) => void;
  onAskAI?: (code: string) => void;
  onMemorize?: (content: string) => void;
  generationTimerNode?: React.ReactNode;
  generationStepsNode?: React.ReactNode;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg,
  isCodeMode,
  userPhoto,
  onRegenerate,
  onContinue,
  isLastMessage,
  onEdit,
  onBranch,
  userSettings,
  onAnalyzeSecurity,
  onAskAI,
  onMemorize,
  generationTimerNode,
  generationStepsNode,
}) => {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSelectText, setShowSelectText] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [isThinkExpanded, setIsThinkExpanded] = useState(false);
  const [isThinkVisible, setIsThinkVisible] = useState(true);
  const [isUserTextExpanded, setIsUserTextExpanded] = useState(false);

  const actionsMenuRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(actionsMenuRef, () => {
    if (showActions) setShowActions(false);
  });

  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const getCleanText = (text: string) => {
    let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    clean = clean.replace(/(\*\*|__)(.*?)\1/g, '$2');
    clean = clean.replace(/(\*|_)(.*?)\1/g, '$2');
    clean = clean.replace(/^#+\s+/gm, '');
    clean = clean.replace(/```[a-z]*\n([\s\S]*?)```/g, '\n$1\n');
    clean = clean.replace(/`([^`]+)`/g, '$1');
    return clean.trim();
  };

  const handleCopy = async () => {
    await copyToClipboard(getCleanText(msg.content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async (url: string, filename: string = 'image') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
       // fallback
       const link = document.createElement("a");
       link.href = url;
       link.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
       link.click();
    }
  };

  const handleCopyImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar imagem. Certifique-se que o navegador suporta isso.", err);
    }
  };

  const handleDownloadText = () => {
    const blob = new Blob([getCleanText(msg.content)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${Date.now()}.txt`;
    a.click();
  };

  const getCleanReadableText = (text?: string) => {
    if (!text) return "";
    let clean = typeof text === 'string' ? text : String(text);
    // Remove think blocks
    clean = clean.replace(/<think>[\s\S]*?<\/think>/g, "");
    // Remove code blocks
    clean = clean.replace(/```[\s\S]*?```/g, " o trecho de código foi ocultado da leitura verbal. ");
    // Convert some simple markdown
    clean = clean.replace(/\*\*/g, "");
    clean = clean.replace(/\#/g, "");
    return clean;
  };

  const toggleTTS = async () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      // stop internal audio element if exists
      const audioEl = document.getElementById(`audio-player-${msg.id}`) as HTMLAudioElement;
      if (audioEl) {
         audioEl.pause();
         audioEl.currentTime = 0;
      }
      setIsPlaying(false);
      return;
    }

    const text = getCleanReadableText(msg.content) || "Sem conteúdo para ler.";
    setIsPlaying(true);

    try {
      const { getAI } = await import("../App");
      const ai = getAI();
      if (ai) {
        // Attempt to use Gemini TTS
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Leia o seguinte texto de forma expressiva e natural em português do Brasil, num tom amigável. Não leia blocos de código grandes se houver.\n\n${text.substring(0, 5000)}`,
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } }
            }
          }
        });
        
        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          const audioUrl = `data:audio/wav;base64,${audioData}`;
          let audioEl = document.getElementById(`audio-player-${msg.id}`) as HTMLAudioElement;
          if (!audioEl) {
             audioEl = document.createElement("audio");
             audioEl.id = `audio-player-${msg.id}`;
             document.body.appendChild(audioEl);
          }
          audioEl.src = audioUrl;
          audioEl.onended = () => setIsPlaying(false);
          audioEl.onerror = () => setIsPlaying(false);
          audioEl.play();
          return;
        }
      }
    } catch (e) {
      console.warn("Gemini TTS failed, falling back to native.", e);
    }

    // Fallback to native
    window.speechSynthesis.cancel(); // Clear any stuck speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 0.9;
    const voices = window.speechSynthesis.getVoices();
    
    // Preferred "Voz Laranja / Masculina do Google"
    const selectedVoice = voices.find(v => v.lang.includes("pt-BR") && v.name.includes("Google") && (v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("masc")))
      || voices.find(v => v.lang.includes("pt-BR") && (v.name.includes("Daniel") || v.name.includes("Antonio") || v.name.includes("Thiago") || v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("masc"))) 
      || voices.find(v => v.lang.includes("pt-BR") && v.name.includes("Google"));

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setIsPlaying(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadProject = async () => {
    const codeBlocks: { language: string; code: string }[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(msg.content)) !== null) {
      codeBlocks.push({
        language: match[1] || "txt",
        code: match[2].trim(),
      });
    }

    if (codeBlocks.length === 0) return;

    const zip = new JSZip();
    codeBlocks.forEach((block, index) => {
      // Try to guess a filename if not provided in the comment
      let filename = `file_${index + 1}.${block.language}`;
      const firstLine = block.code.split('\n')[0];
      if (firstLine.startsWith('//') || firstLine.startsWith('/*') || firstLine.startsWith('<!--')) {
        const potentialName = firstLine.replace(/[\/\*<!>\-]/g, '').trim();
        if (potentialName.includes('.')) {
          filename = potentialName;
        }
      }
      zip.file(filename, block.code);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };


  let thinkContent = "";
  let mainContent = msg.content || "";

  if (!isUser) {
    const thinkStart = mainContent.indexOf("<think>");
    if (thinkStart !== -1) {
      const thinkEnd = mainContent.indexOf("</think>");
      if (thinkEnd !== -1) {
        thinkContent = mainContent.substring(thinkStart + 7, thinkEnd).trim();
        mainContent = mainContent.substring(0, thinkStart) + mainContent.substring(thinkEnd + 8);
      } else {
        thinkContent = mainContent.substring(thinkStart + 7).trim();
        mainContent = mainContent.substring(0, thinkStart);
      }
    }
  }

  const hasCodeBlocks = msg.content && typeof msg.content === 'string' && msg.content.includes("```");

  const msgStateRef = React.useRef({ content: msg.content, isGenerating: msg.isGenerating });
  React.useEffect(() => {
    msgStateRef.current = { content: msg.content, isGenerating: msg.isGenerating };
  }, [msg.content, msg.isGenerating]);

  const aiMarkdownComponents = React.useMemo<any>(() => ({
    pre: ({ node, children, ...props }: any) => {
      if (React.isValidElement(children)) {
        const codeProps = children.props as any;
        const match = /language-(\w+)/.exec(codeProps.className || "");
        const codeString = String(codeProps.children).replace(/\n$/, "");
        const language = match ? match[1] : guessLanguage(codeString);
        return (
          <CodeBlock
            language={language}
            code={codeString}
            userSettings={userSettings}
            fullMessageContent={msgStateRef.current.content}
            onAnalyzeSecurity={onAnalyzeSecurity}
            onAskAI={onAskAI}
            isGenerating={msgStateRef.current.isGenerating}
          />
        );
      }
      return <pre {...props}>{children}</pre>;
    },
    code: ({ node, className, children, ...props }: any) => {
      return (
        <code
          className={`px-1.5 py-0.5 rounded text-sm font-mono border whitespace-pre-wrap break-words bg-bg-code border-border-subtle ${className || ""}`}
          {...props}
        >
          {children}
        </code>
      );
    },
    p: ({ children }: any) => <div className="mb-4 last:mb-0 leading-relaxed">{children}</div>,
    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
    table: ({ children }: any) => <div className="overflow-x-auto w-full mb-4"><table className="min-w-full divide-y divide-border-subtle">{children}</table></div>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 pl-4 italic my-4 border-primary/30">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => {
      if (href?.startsWith('blob:') && String(children).includes('VIDEO_BLOB')) {
        return <video controls src={href} className="max-w-full rounded-xl border border-border-strong shadow-lg my-4" />;
      }
      if (href?.startsWith('blob:') && String(children).includes('AUDIO_BLOB')) {
        return <audio controls src={href} className="w-full my-4" />;
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
    },
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    img: ({ src, alt }: any) => {
      if (!src) return null;
      const isGeneratedImage = src.startsWith("data:image") || src.startsWith("https://image.pollinations.ai");
      return (
        <div className="relative group inline-block max-w-full my-4">
          <img 
            src={src} 
            alt={alt || "Imagem"} 
            className="max-w-full h-auto cursor-pointer rounded-lg shadow-sm border border-border-subtle group-hover:opacity-90 transition-opacity" 
            referrerPolicy="no-referrer" 
            onClick={() => setPreviewFile({ dataUrl: src, mimeType: 'image/png' })} 
            title="Clique para expandir" 
          />
          {isGeneratedImage && (
            <div className="absolute bottom-2 right-2 w-6 h-6 opacity-30 hover:opacity-100 transition-opacity select-none drop-shadow-md flex items-center justify-center p-1 rounded-full bg-black/40 backdrop-blur-md pointer-events-none">
             <span className="text-white text-xs font-bold">AI</span>
           </div>
          )}
        </div>
      );
    },
  }), [userSettings, onAnalyzeSecurity, onAskAI]);

  const userMarkdownComponents = React.useMemo<any>(() => ({
    pre: ({ node, children, ...props }: any) => {
      if (React.isValidElement(children)) {
        const codeProps = children.props as any;
        const match = /language-(\w+)/.exec(codeProps.className || "");
        const codeString = String(codeProps.children).replace(/\n$/, "");
        const language = match ? match[1] : guessLanguage(codeString);
        return (
          <CodeBlock
            language={language}
            code={codeString}
            userSettings={userSettings}
            fullMessageContent={msgStateRef.current.content}
            onAnalyzeSecurity={onAnalyzeSecurity}
            onAskAI={onAskAI}
            isGenerating={msgStateRef.current.isGenerating}
          />
        );
      }
      return <pre {...props}>{children}</pre>;
    },
    code: ({ node, className, children, ...props }: any) => {
      return (
        <code
          className={`px-1.5 py-0.5 rounded text-sm font-mono border bg-transparent border-white/20 whitespace-pre-wrap break-words ${className || ""}`}
          {...props}
        >
          {children}
        </code>
      );
    },
    p: ({ children }: any) => <div className="mb-2 last:mb-0 leading-relaxed text-[15px]">{children}</div>,
    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    img: ({ src, alt }: any) => {
      if (!src) return null;
      return (
        <img 
          src={src} 
          alt={alt || "Imagem"} 
          className="max-w-full h-auto cursor-pointer rounded-lg shadow-sm border border-border-subtle my-2 hover:opacity-90 transition-opacity" 
          referrerPolicy="no-referrer" 
          onClick={() => setPreviewFile({ dataUrl: src, mimeType: 'image/png' })} 
          title="Clique para expandir" 
        />
      );
    },
  }), [userSettings, onAnalyzeSecurity, onAskAI]);

  return (
    <>
      {showSelectText && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-bg-surface w-full max-w-3xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border-strong">
            <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-surface-hover">
              <h3 className="font-bold text-text-primary">Selecionar Texto</h3>
              <button 
                onClick={() => setShowSelectText(false)} 
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Fechar seleção de texto"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div 
              className="flex-1 w-full bg-transparent p-6 overflow-y-auto whitespace-pre-wrap break-words outline-none text-text-primary text-lg custom-scrollbar select-text" 
            >
              {msg.content}
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col gap-2 min-w-0 w-full max-w-full ${isUser ? "items-end text-right" : "items-start text-left"}`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg overflow-hidden ${
            isUser ? "bg-primary text-white" : "bg-bg-surface border border-border-strong"
          }`}
        >
          {isUser ? (
            msg.authorPhoto ? (
              <img src={msg.authorPhoto} alt={msg.authorName || "User"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : userPhoto ? (
              <img src={userPhoto} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-sm font-bold">{msg.authorName ? msg.authorName.charAt(0).toUpperCase() : "U"}</div>
            )
          ) : (
            <AILogo mode={userSettings.mode} />
          )}
        </div>

        <div className={`flex flex-col max-w-full min-w-0 ${isUser ? "items-end" : "items-start"}`}>
          <div className="flex items-center gap-2 mb-1 px-1">
            {isUser ? (
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {msg.authorName || "Você"}
              </span>
            ) : (
              <span className={`text-xs font-bold uppercase tracking-wider animate-pulse bg-clip-text text-transparent ${
                userSettings?.mode === "Thinking" ? "bg-gradient-to-r from-red-400 via-rose-500 to-red-600" :
                userSettings?.mode === "Student" ? "bg-gradient-to-r from-blue-400 via-indigo-500 to-cyan-400" :
                userSettings?.mode === "Nano Banana 2" ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500" :
                "bg-gradient-to-r from-purple-400 via-fuchsia-500 to-purple-600"
              }`}>
                Dev AI
              </span>
            )}
            {generationTimerNode && (
              <div className="ml-2 flex items-center">
                {generationTimerNode}
              </div>
            )}
          </div>
          {generationStepsNode && (
            <div className="mb-2 w-full">
              {generationStepsNode}
            </div>
          )}

          <div
            className={`relative group transition-all duration-300 w-full break-words ${
              isUser ? "text-text-primary flex justify-end" : "text-text-primary"
            }`}
          >
            <div className={`flex flex-col gap-3 min-w-0 ${isUser ? "max-w-[85%]" : "w-full"}`}>
              {thinkContent && isThinkVisible && (
                <div className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-2.5 bg-bg-surface-hover/50">
                    <button 
                      onClick={() => setIsThinkExpanded(!isThinkExpanded)}
                      className="flex-1 flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors text-left"
                      aria-label={isThinkExpanded ? "Recolher processo de pensamento" : "Expandir processo de pensamento"}
                      aria-expanded={isThinkExpanded}
                    >
                      <Brain size={16} className={isThinkExpanded ? "text-primary" : ""} />
                      <span>Processo de pensamento</span>
                      {isThinkExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button 
                      onClick={() => setIsThinkVisible(false)}
                      className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                      title="Fechar processo de pensamento"
                      aria-label="Fechar processo de pensamento"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {isThinkExpanded && (
                    <div className="p-4 border-t border-border-subtle bg-bg-main/30 text-sm text-text-secondary italic whitespace-pre-wrap font-mono leading-relaxed select-text">
                      {thinkContent}
                    </div>
                  )}
                </div>
              )}
              
              {isUser ? (
                <div className="flex flex-col items-end w-full max-w-full">
                  <div className={`bg-bg-surface-hover border border-border-strong px-5 py-3 rounded-2xl rounded-tr-sm inline-block shadow-sm text-left select-text markdown-body max-w-full break-words min-w-0 relative ${!isUserTextExpanded && msg.content.length > 500 ? "max-h-64 overflow-hidden" : "overflow-x-auto"}`}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={userMarkdownComponents}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {!isUserTextExpanded && msg.content.length > 500 && (
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-surface-hover to-transparent pointer-events-none" />
                    )}
                  </div>
                  {msg.content.length > 500 && (
                    <button 
                      onClick={() => setIsUserTextExpanded(!isUserTextExpanded)} 
                      className="mt-2 text-xs font-medium text-text-muted hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
                    >
                      {isUserTextExpanded ? "Mostrar menos" : "Mostrar mais"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="markdown-body select-text w-full max-w-full overflow-x-auto break-words min-w-0">
                  {(mainContent.length > 250000 && !mainContent.includes('blob:')) ? (
                      (() => {
                        const parts = mainContent.split('```');
                        return parts.map((part, index) => {
                          if (index % 2 === 1) { // It's a code block
                            const firstNewline = part.indexOf('\n');
                            let language = "";
                            let code = part;
                            if (firstNewline !== -1) {
                              language = part.substring(0, firstNewline).trim();
                              code = part.substring(firstNewline + 1);
                            }
                            return (
                              <CodeBlock
                                key={index}
                                language={language || guessLanguage(code.substring(0, 500))}
                                code={code}
                                userSettings={userSettings}
                                fullMessageContent={msg.content}
                                onAnalyzeSecurity={onAnalyzeSecurity}
                                onAskAI={onAskAI}
                                isGenerating={msg.isGenerating}
                              />
                            );
                          } else {
                            return (
                              <div key={index} className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed my-2">
                                {part}
                              </div>
                            );
                          }
                        });
                      })()
                  ) : (
                  <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={aiMarkdownComponents}
                >
                  {mainContent}
                </ReactMarkdown>
                )}
              </div>
              )}
              
              {isLastMessage && !isUser && onContinue && msg.content && (
                (() => {
                  const isCodeBlockOpen = (msg.content.match(/```/g) || []).length % 2 !== 0;
                  const endsAbruptly = msg.content.length > 2000 && !msg.content.trim().match(/(\.|!|\?|```|>|}|\])$/);
                  const isCutOff = isCodeBlockOpen || endsAbruptly;
                  
                  if (!isCutOff) return null;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex justify-start"
                    >
                      <button
                        onClick={() => onContinue(msg)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-text-primary bg-bg-surface border border-border-strong hover:bg-bg-surface-hover hover:border-text-secondary rounded-full shadow-sm transition-all group"
                      >
                        <Play size={14} className="fill-current opacity-70 group-hover:opacity-100" />
                        <span>Continuar de onde parou</span>
                      </button>
                    </motion.div>
                  );
                })()
              )}
            </div>
          </div>

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
              {msg.attachments.map((att: any, idx: number) => {
                const isImage = att.mimeType.startsWith("image/");
                return (
                  <div key={idx} className="relative group/att rounded-lg overflow-hidden border border-white/20 shadow-lg cursor-pointer" onClick={() => setPreviewFile({ dataUrl: att.dataUrl, mimeType: att.mimeType })}>
                    {isImage ? (
                      <img src={att.dataUrl} alt="Attachment" className="w-24 h-24 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-24 h-24 bg-white/5 flex flex-col items-center justify-center gap-2">
                        <FileText size={24} className="text-white/70" />
                        <span className="text-[10px] text-white/50 uppercase truncate w-full px-2 text-center">
                          {att.mimeType.split("/")[1] || "FILE"}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(att.dataUrl);
                        }}
                        className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform"
                        title="Baixar Anexo"
                        aria-label="Baixar Anexo"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions Menu */}
          <div className={`mt-2 flex items-center gap-2 w-full ${isUser ? "justify-end" : "justify-start"}`}>
            {!isUser && (
              <button
                onClick={toggleTTS}
                className={`p-1.5 rounded-lg transition-all ${
                  isPlaying ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
                }`}
                title={isPlaying ? "Parar áudio" : "Ouvir em voz alta"}
                aria-label={isPlaying ? "Parar áudio" : "Ouvir em voz alta"}
              >
                {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}
            <div className="relative" ref={actionsMenuRef}>
              <button
                onClick={() => setShowActions(!showActions)}
                className={`p-1.5 rounded-lg transition-all ${
                  showActions ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
                }`}
                title="Mais opções"
                aria-label="Mais opções"
                aria-expanded={showActions}
              >
                <MoreVertical size={18} />
              </button>

              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute bottom-full mb-1 w-48 py-1 bg-bg-surface border border-border-subtle rounded-xl shadow-xl z-50 flex flex-col ${
                    isUser ? "right-0" : "left-0"
                  }`}
                >
                  <button
                    onClick={() => {
                      handleCopy();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                  >
                    {copied ? <CheckCheck size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    <span>Copiar</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSelectText(true);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                  >
                    <ExternalLink size={16} />
                    <span>Selecionar texto</span>
                  </button>

                  {onMemorize && (
                    <button
                      onClick={() => {
                        onMemorize(msg.text);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-blue-500 hover:bg-bg-surface-hover transition-colors text-left"
                    >
                      <Brain size={16} />
                      <span>Salvar na Memória</span>
                    </button>
                  )}

                  {!isUser && onContinue && (
                    <button
                      onClick={() => {
                        onContinue(msg);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-blue-400 hover:bg-bg-surface-hover transition-colors text-left"
                    >
                      <Play size={16} />
                      <span>Continuar Geração</span>
                    </button>
                  )}

                  {isUser && onEdit && (
                    <button
                      onClick={() => {
                        onEdit(msg);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                    >
                      <Edit2 size={16} />
                      <span>Editar</span>
                    </button>
                  )}

                  {!isUser && onRegenerate && (
                    <button
                      onClick={() => {
                        onRegenerate(msg);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                    >
                      <RotateCcw size={16} />
                      <span>Refazer</span>
                    </button>
                  )}

                  {!isUser && onBranch && (
                    <button
                      onClick={() => {
                        onBranch(msg);
                        setShowActions(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                    >
                      <SplitSquareHorizontal size={16} />
                      <span>Derivar novo chat</span>
                    </button>
                  )}

                  {!isUser && hasCodeBlocks && (
                    <button
                      onClick={() => {
                        handleDownloadProject();
                        setShowActions(false);
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                    >
                      <Archive size={16} />
                      <span>Baixar Projeto (ZIP)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      handleDownloadText();
                      setShowActions(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-surface-hover transition-colors text-left"
                  >
                    <Download size={16} />
                    <span>Download</span>
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        dataUrl={previewFile?.dataUrl || ""}
        mimeType={previewFile?.mimeType || "image/png"}
      />
    </>
  );
}, (prevProps, nextProps) => {
  const attachmentsEqual = (a1: any[], a2: any[]) => {
    if (!a1 && !a2) return true;
    if (!a1 || !a2) return false;
    if (a1.length !== a2.length) return false;
    for (let i = 0; i < a1.length; i++) {
      if (a1[i].mimeType !== a2[i].mimeType || a1[i].dataUrl?.length !== a2[i].dataUrl?.length) {
         return false;
      }
    }
    return true;
  };

  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.role === nextProps.msg.role &&
    prevProps.msg.isGenerating === nextProps.msg.isGenerating &&
    prevProps.msg.streamingThinkContent === nextProps.msg.streamingThinkContent &&
    attachmentsEqual(prevProps.msg.attachments, nextProps.msg.attachments) &&
    prevProps.isCodeMode === nextProps.isCodeMode &&
    prevProps.isLastMessage === nextProps.isLastMessage
  );
});
