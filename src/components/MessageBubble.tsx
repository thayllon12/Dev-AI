import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Copy, CheckCheck, RotateCcw, Edit2, Code2, Download, ExternalLink, MoreVertical, Volume2, VolumeX, X, SplitSquareHorizontal } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { AILogo } from "./AILogo";
import { copyToClipboard } from "../lib/utils";

interface MessageBubbleProps {
  msg: any;
  isCodeMode: boolean;
  themeColor: string;
  userPhoto?: string | null;
  onRegenerate?: (msg: any) => void;
  onEdit?: (msg: any, newContent: string) => void;
  onBranch?: (msg: any) => void;
  userSettings: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isCodeMode,
  themeColor,
  userPhoto,
  onRegenerate,
  onEdit,
  onBranch,
  userSettings,
}) => {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [showActions, setShowActions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSelectText, setShowSelectText] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const handleCopy = async () => {
    await copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== msg.content) {
      onEdit(msg, editContent);
    }
    setIsEditing(false);
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
    const blob = new Blob([msg.content], { type: "text/plain" });
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
      const utterance = new SpeechSynthesisUtterance(msg.content);
      utterance.lang = 'pt-BR';
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <>
      {showSelectText && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-bg-surface w-full max-w-3xl h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-border-strong">
            <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-bg-surface-hover">
              <h3 className="font-bold text-text-primary">Selecionar Texto</h3>
              <button onClick={() => setShowSelectText(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
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
            userPhoto ? (
              <img src={userPhoto} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-sm font-bold">U</div>
            )
          ) : (
            <AILogo mode={userSettings.mode} />
          )}
        </div>

        <div className={`flex flex-col max-w-full ${isUser ? "items-end" : "items-start"}`}>
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isUser ? "Você" : "Dev AI"}
            </span>
          </div>

          <div
            className={`relative group transition-all duration-300 w-full break-words ${
              isUser ? "text-text-primary" : "text-text-primary"
            }`}
          >
          {isEditing ? (
            <div className="flex flex-col gap-3 min-w-[300px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-bg-surface border border-border-strong rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[100px]"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(msg.content);
                  }}
                  className="px-3 py-1.5 text-xs font-bold hover:bg-bg-surface-hover rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "";
                    const codeString = String(children).replace(/\n$/, "");

                    if (!inline && match) {
                      return (
                        <CodeBlock
                          language={language}
                          code={codeString}
                          userSettings={userSettings}
                        />
                      );
                    }
                    return (
                      <code
                        className={`px-1.5 py-0.5 rounded text-sm font-mono border ${
                          isUser ? "bg-white/10 border-white/20" : "bg-bg-code border-border-subtle"
                        }`}
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
                            >
                              <Download size={24} />
                            </button>
                            <button
                              onClick={() => window.open(src, "_blank")}
                              className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                              title="Ver em Tela Cheia"
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
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
              {msg.attachments.map((att: any, idx: number) => (
                <div key={idx} className="relative group/att rounded-lg overflow-hidden border border-white/20 shadow-lg">
                  <img src={att.dataUrl} alt="Attachment" className="w-24 h-24 object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDownloadImage(att.dataUrl)}
                      className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions Menu */}
          <div className="mt-2 flex items-center gap-2 w-full">
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className={`p-1.5 rounded-lg transition-all ${
                  showActions ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
                }`}
                title="Mais opções"
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
                        setIsEditing(true);
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

            {!isUser && (
              <button
                onClick={toggleTTS}
                className={`p-1.5 rounded-lg transition-all ${
                  isPlaying ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
                }`}
                title={isPlaying ? "Parar áudio" : "Ouvir em voz alta"}
              >
                {isPlaying ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
};
