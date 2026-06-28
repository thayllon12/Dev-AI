import React from "react";
import { Brain, Sparkles, Network } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReasoningWebProps {
  content: string;
  isGenerating?: boolean;
}

export const ReasoningWeb: React.FC<ReasoningWebProps> = ({ content, isGenerating }) => {
  // Simple heuristic to split reasoning into "nodes" or steps
  const steps = content.split('\n').filter(line => line.trim().length > 0);

  return (
    <div className="relative pl-6 py-2 my-4 font-mono text-xs text-text-muted">
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/20 to-transparent"></div>
      
      <div className="flex items-center gap-2 text-blue-400 mb-4 font-bold uppercase tracking-wider text-[10px]">
        <Network size={14} className="animate-pulse" />
        Teia de Raciocínio Profundo
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="absolute -left-[1.35rem] top-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
            <div className="bg-bg-surface border border-white/5 p-3 rounded-lg shadow-sm">
              {step}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-4 text-blue-400/50"
          >
            <Sparkles size={12} className="animate-spin" />
            <span className="text-[10px] animate-pulse">Expandindo sinapses...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
