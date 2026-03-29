import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Key, Palette, Sun, Moon, Monitor, Settings, LogOut, Trash2, Code2 } from "lucide-react";
import { cn } from "../lib/utils";

interface SettingsModalProps {
  onClose: () => void;
  currentSettings: any;
  updateSetting: (key: string, value: any) => void;
  handleSelectKey: () => void;
  hasCustomKey: boolean;
  onLogout: () => void;
  onClearHistory: () => void;
  logs?: { type: string; msg: string; time: Date }[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  currentSettings,
  updateSetting,
  handleSelectKey,
  hasCustomKey,
  onLogout,
  onClearHistory,
  logs = [],
}) => {
  const [height, setHeight] = useState(window.innerHeight * 0.8);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setHeight(Math.max(300, Math.min(newHeight, window.innerHeight * 0.95)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-bg-modal border-t border-x border-border-strong rounded-t-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-200"
        style={{ height: `${height}px` }}
      >
        {/* Resize Handle */}
        <div
          className="h-6 flex items-center justify-center cursor-ns-resize hover:bg-bg-surface-hover transition-colors shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="w-12 h-1.5 bg-border-strong rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-2 border-b border-border-strong shrink-0">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            <h3 className="text-lg font-bold text-text-primary">Configurações da IA</h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-2 rounded-lg hover:bg-bg-surface-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* API Key Section */}
          <div className="pb-6 border-b border-border-strong">
            <label className="block text-sm font-bold text-text-secondary mb-2 uppercase tracking-wider">
              Chave API Personalizada
            </label>
            <p className="text-xs text-text-muted mb-4">
              Se você atingir o limite de uso gratuito, pode usar sua própria chave API do Google AI Studio.
            </p>
            <button
              onClick={handleSelectKey}
              className={cn(
                "w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-sm",
                hasCustomKey
                  ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20"
                  : "bg-primary/10 border-primary/50 text-primary hover:bg-primary/20"
              )}
            >
              <Key size={16} />
              {hasCustomKey ? "Chave API Configurada" : "Configurar Chave API"}
            </button>
            {hasCustomKey && (
              <p className="text-[10px] text-emerald-500/70 mt-2 text-center font-medium">
                Sua chave personalizada está sendo usada para todas as requisições.
              </p>
            )}
          </div>

          {/* Toggles Section */}
          <div className="space-y-4 pt-4 border-t border-border-strong">
            {[
              {
                id: "fullscreenEditor",
                label: "Editor em Tela Cheia",
                desc: "Abre blocos de código em um editor expansível.",
                icon: <Code2 size={18} />,
              },
              {
                id: "notificationsEnabled",
                label: "Notificações",
                desc: "Receber alertas de novas mensagens.",
                icon: <Monitor size={18} />,
              },
              {
                id: "vibration",
                label: "Vibração",
                desc: "Feedback tátil ao receber mensagens.",
                icon: <Monitor size={18} />,
              },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-surface/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-surface rounded-lg text-primary border border-border-subtle">
                    {item.icon}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-secondary">
                      {item.label}
                    </label>
                    <p className="text-xs text-text-muted mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting(item.id, !currentSettings[item.id])}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative shadow-inner",
                    currentSettings[item.id] ? "bg-primary" : "bg-bg-surface-hover"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full bg-white absolute top-1 transition-transform shadow-md",
                      currentSettings[item.id] ? "translate-x-7" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Personality Section */}
          <div className="pt-4 border-t border-border-strong">
            <label className="block text-sm font-bold text-text-secondary mb-3 uppercase tracking-wider">
              Personalidade da IA
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: "Padrão", value: "Você é um assistente prestativo e amigável." },
                { label: "Sarcástico", value: "Você é um assistente sarcástico, engraçado e um pouco atrevido." },
                { label: "Direto", value: "Você é extremamente direto, conciso e profissional. Sem rodeios." },
                { label: "Poético", value: "Você fala de forma poética e filosófica." },
                { label: "Nerd", value: "Você é um nerd de tecnologia, usa termos técnicos e é muito entusiasmado." },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => updateSetting("personality", preset.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                    currentSettings.personality === preset.value
                      ? "bg-primary text-white border-primary"
                      : "bg-bg-surface border-border-subtle text-text-muted hover:bg-bg-surface-hover"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <textarea
              value={currentSettings.personality || ""}
              onChange={(e) => updateSetting("personality", e.target.value)}
              placeholder="Ex: Alegre, raivoso, sarcástico, direto ao ponto..."
              className="w-full bg-bg-surface border border-border-strong rounded-2xl p-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none h-32 transition-all shadow-sm"
            />
            <p className="text-xs text-text-muted mt-3 italic">
              Defina como a IA deve se comportar e falar com você. Isso mudará o tom das respostas.
            </p>
          </div>

          {/* Data Management Section */}
          <div className="pt-8 space-y-4">
            {currentSettings.isDevUnlocked && (
              <div className="mb-8 border border-border-strong rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-bg-surface px-4 py-3 border-b border-border-strong flex items-center justify-between">
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <Code2 size={16} className="text-primary" />
                    Console Dev / Logs
                  </h4>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Modo Desenvolvedor
                  </span>
                </div>
                <div className="bg-[#0d0d0d] p-4 h-64 overflow-y-auto font-mono text-xs custom-scrollbar">
                  {logs.length === 0 ? (
                    <div className="text-text-muted/50 italic text-center mt-20">Nenhum log registrado.</div>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={cn(
                        "mb-1 pb-1 border-b border-white/5",
                        log.type === 'error' ? "text-red-400" : log.type === 'warn' ? "text-yellow-400" : "text-green-400"
                      )}>
                        <span className="text-white/30 mr-2">[{log.time.toLocaleTimeString()}]</span>
                        <span className="break-all">{log.msg}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (window.confirm("Tem certeza que deseja apagar TODO o histórico de conversas? Esta ação não pode ser desfeita.")) {
                  onClearHistory();
                }
              }}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500/20 transition-all border border-orange-500/20"
            >
              <Trash2 size={20} />
              Limpar Histórico de Conversas
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all border border-red-500/20"
            >
              <LogOut size={20} />
              Sair da Conta
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
