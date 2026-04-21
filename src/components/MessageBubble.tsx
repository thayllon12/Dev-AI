import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Copy, CheckCheck, RotateCcw, Edit2, Code2, Download, ExternalLink, MoreVertical, Volume2, VolumeX, X, SplitSquareHorizontal, Brain, ChevronDown, ChevronUp, Archive } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { FilePreviewModal } from "./FilePreviewModal";
import { AILogo } from "./AILogo";
import { copyToClipboard, guessLanguage } from "../lib/utils";
import { FileText } from "lucide-react";
import JSZip from "jszip";

interface MessageBubbleProps {
  msg: any;
  isCodeMode: boolean;
  themeColor: string;
  userPhoto?: string | null;
  onRegenerate?: (msg: any) => void;
  onEdit?: (msg: any) => void;
  onBranch?: (msg: any) => void;
  userSettings: any;
  onAnalyzeSecurity?: (code: string) => void;
  onAskAI?: (code: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg,
  isCodeMode,
  themeColor,
  userPhoto,
  onRegenerate,
  onEdit,
  onBranch,
  userSettings,
  onAnalyzeSecurity,
  onAskAI,
}) => {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSelectText, setShowSelectText] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ dataUrl: string; mimeType: string } | null>(null);
  const [isThinkExpanded, setIsThinkExpanded] = useState(false);
  const [isThinkVisible, setIsThinkVisible] = useState(true);

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

  const handleDownloadImage = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadText = () => {
    const blob = new Blob([getCleanText(msg.content)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message-${Date.now()}.txt`;
    a.click();
  };

  const toggleTTS = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(getCleanText(msg.content));
      utterance.lang = 'pt-BR';
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
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

  const hasCodeBlocks = /```(\w+)?\n([\s\S]*?)```/g.test(msg.content);

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
        className={`flex flex-col gap-2 ${isUser ? "items-end text-right" : "items-start text-left"}`}
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

        <div className={`flex flex-col max-w-full ${isUser ? "items-end" : "items-start"}`}>
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isUser ? (msg.authorName || "Você") : "Dev AI"}
            </span>
          </div>

          <div
            className={`relative group transition-all duration-300 w-full break-words ${
              isUser ? "text-text-primary flex justify-end" : "text-text-primary"
            }`}
          >
            <div className={`flex flex-col gap-3 ${isUser ? "max-w-[85%]" : "w-full"}`}>
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
                    <div className="p-4 border-t border-border-subtle bg-bg-main/30 text-sm text-text-secondary italic whitespace-pre-wrap font-mono leading-relaxed">
                      {thinkContent}
                    </div>
                  )}
                </div>
              )}
              
              {isUser ? (
                <div className="bg-bg-surface-hover border border-border-strong px-5 py-3 rounded-2xl rounded-tr-sm inline-block shadow-sm text-left">
                  <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
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
                            fullMessageContent={msg.content}
                            onAnalyzeSecurity={onAnalyzeSecurity}
                            onAskAI={onAskAI}
                          />
                        );
                      }
                      return <pre {...props}>{children}</pre>;
                    },
                    code: ({ node, className, children, ...props }: any) => {
                      return (
                        <code
                          className={`px-1.5 py-0.5 rounded text-sm font-mono border ${
                            isUser ? "bg-white/10 border-white/20" : "bg-bg-code border-border-subtle"
                          } ${className || ""}`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className={`border-l-4 pl-4 italic my-4 ${isUser ? "border-white/30" : "border-primary/30"}`}>
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => {
                      if (href?.startsWith('blob:') && String(children).includes('VIDEO_BLOB')) {
                        return <video controls src={href} className="max-w-full rounded-xl border border-border-strong shadow-lg my-4" />;
                      }
                      if (href?.startsWith('blob:') && String(children).includes('AUDIO_BLOB')) {
                        return <audio controls src={href} className="w-full my-4" />;
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>;
                    },
                    img: ({ src, alt }) => {
                      if (!src) return null;
                      const isGeneratedImage = src.startsWith("data:image");
                      return (
                        <span className="relative group my-4 rounded-xl overflow-hidden shadow-2xl border border-border-strong block w-fit">
                          <img src={src} alt={alt || "Imagem"} className="max-w-full h-auto" referrerPolicy="no-referrer" />
                          {isGeneratedImage && (
                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <button
                                onClick={() => handleDownloadImage(src)}
                                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                                title="Baixar Imagem"
                                aria-label="Baixar Imagem"
                              >
                                <Download size={24} />
                              </button>
                              <button
                                onClick={() => window.open(src, "_blank")}
                                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                                title="Ver em Tela Cheia"
                                aria-label="Ver em Tela Cheia"
                              >
                                <ExternalLink size={24} />
                              </button>
                            </span>
                          )}
                        </span>
                      );
                    },
                  }}
                >
                  {mainContent}
                </ReactMarkdown>
              </div>
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
            <div className="relative">
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
                  className={`absolute top-full mt-1 w-48 py-1 bg-bg-surface border border-border-subtle rounded-xl shadow-xl z-10 flex flex-col ${
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

      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          dataUrl={previewFile.dataUrl}
          mimeType={previewFile.mimeType}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.role === nextProps.msg.role &&
    JSON.stringify(prevProps.msg.attachments) === JSON.stringify(nextProps.msg.attachments) &&
    prevProps.isCodeMode === nextProps.isCodeMode &&
    prevProps.themeColor === nextProps.themeColor &&
    prevProps.userPhoto === nextProps.userPhoto &&
    prevProps.userSettings?.mode === nextProps.userSettings?.mode &&
    prevProps.userSettings?.theme === nextProps.userSettings?.theme
  );
});
