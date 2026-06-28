import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Database, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  messages: any[];
}

export function ContextTokenCounter({ messages }: Props) {
  const estimatedTokens = useMemo(() => {
    const totalChars = messages.reduce((acc, msg) => {
      let len = 0;
      if (typeof msg.content === 'string') {
        len = msg.content.length;
      }
      return acc + len;
    }, 0);
    // Approximate: 1 token ~= 4 characters for English, might be different for others, but good baseline
    return Math.ceil(totalChars / 4);
  }, [messages]);

  // Context window limits
  const MAX_LIMIT = 2000000;
  const WARNING_THRESHOLD = 1800000;
  const DANGER_THRESHOLD = 1950000;

  const getStatusColor = () => {
    if (estimatedTokens >= DANGER_THRESHOLD) return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (estimatedTokens >= WARNING_THRESHOLD) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary border-transparent';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (estimatedTokens === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg border transition-colors text-[10px] sm:text-xs font-medium cursor-default shrink-0 whitespace-nowrap",
        getStatusColor()
      )}
      title="Uso estimado de Tokens de Contexto (Limite: 2M)"
    >
      {estimatedTokens >= WARNING_THRESHOLD ? (
        <AlertTriangle size={12} className="animate-pulse sm:w-[14px] sm:h-[14px]" />
      ) : (
        <Database size={12} className="sm:w-[14px] sm:h-[14px]" />
      )}
      <span>{formatNumber(estimatedTokens)} / 2M</span>
    </motion.div>
  );
}
