import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "motion/react";
import { Copy, CheckCheck, RotateCcw, Edit2, Code2, Download, ExternalLink, MoreHorizontal } from "lucide-react";
import { CodeBlock } from "./CodeBlock";

interface MessageBubbleProps {
  msg: any;
  isCodeMode: boolean;
  themeColor: string;
  userPhoto?: string | null;
  onRegenerate?: (msg: any) => void;
  onEdit?: (msg: any, newContent: string) => void;
  userSettings: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isCodeMode,
  themeColor,
  userPhoto,
  onRegenerate,
  onEdit,
  userSettings,
}) => {
  const isUser = msg.role === "user";
  const [copied, setCopied] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(msg.content);
  const [showActions, setShowActions] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
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

  return (
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
          ) : isCodeMode ? (
            <Code2 size={20} className="text-primary" />
          ) : (
            <img
              src="https://api.dicebear.com/7.x/bottts/svg?seed=DevAI&backgroundColor=007bff"
              alt="Dev AI"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        <div className={`flex flex-col max-w-full ${isUser ? "items-end" : "items-start"}`}>
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isUser ? "Você" : "Dev AI"}
            </span>
            {!isUser && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter">
                Pro
              </span>
            )}
          </div>

          <div
            className={`relative group transition-all duration-300 w-full break-words ${
              isUser ? "text-text-primary" : "text-text-primary"
            }`}
            style={{
              fontSize: userSettings.customization?.fontSize || "16px",
              fontFamily: userSettings.customization?.fontFamily || "Inter",
            }}
          >
          {isEditing ? (
            <div className="flex flex-col gap-3 min-w-[300px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 resize-none min-h-[100px]"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(msg.content);
                  }}
                  className="px-3 py-1.5 text-xs font-bold hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs font-bold bg-white text-primary rounded-lg hover:bg-white/90 transition-colors"
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
                    const isGeneratedImage = src?.startsWith("data:image");
                    return (
                      <div className="relative group my-4 rounded-xl overflow-hidden shadow-2xl border border-border-strong">
                        <img src={src} alt={alt} className="max-w-full h-auto" referrerPolicy="no-referrer" />
                        {isGeneratedImage && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button
                              onClick={() => handleDownloadImage(src!)}
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
                          </div>
                        )}
                      </div>
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
          <div className="mt-2 flex flex-col items-start w-full">
            <button
              onClick={() => setShowActions(!showActions)}
              className={`p-1.5 rounded-lg transition-all ${
                showActions ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-primary hover:bg-bg-surface-hover"
              }`}
              title="Mais opções"
            >
              <MoreHorizontal size={18} />
            </button>

            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-1 mt-1 p-1 bg-bg-surface border border-border-subtle rounded-xl shadow-xl z-10 ${
                  isUser ? "self-end" : "self-start"
                }`}
              >
                <button
                  onClick={() => {
                    handleCopy();
                    setShowActions(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
                >
                  {copied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>Copiar</span>
                </button>

                {isUser && onEdit && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
                  >
                    <Edit2 size={14} />
                    <span>Editar</span>
                  </button>
                )}

                {!isUser && onRegenerate && (
                  <button
                    onClick={() => {
                      onRegenerate(msg);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
                  >
                    <RotateCcw size={14} />
                    <span>Refazer</span>
                  </button>
                )}

                {/* Download option if message has images */}
                {(msg.attachments?.length > 0 || msg.content.includes("data:image")) && (
                  <button
                    onClick={() => {
                      // If it's a generated image in content
                      const match = msg.content.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/);
                      if (match && match[1]) {
                        handleDownloadImage(match[1]);
                      } else if (msg.attachments && msg.attachments.length > 0) {
                        // Download first attachment for simplicity in menu
                        handleDownloadImage(msg.attachments[0].dataUrl);
                      }
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };
