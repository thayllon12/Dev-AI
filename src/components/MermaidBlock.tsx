import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidBlockProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
});

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svgCode, setSvgCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          // Generate a unique ID for this diagram
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          if (isMounted) {
            setSvgCode(svg);
            setError(null);
          }
        } catch (e: any) {
          if (isMounted) {
            setError(e?.message || "Invalid Mermaid syntax");
            console.error("Mermaid error:", e);
          }
        }
      }
    };
    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div className="my-4 p-4 bg-bg-surface border border-border-strong rounded-xl overflow-x-auto">
      {error ? (
        <div className="text-red-500 font-mono text-sm">
          <strong>Mermaid Error:</strong>
          <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
        </div>
      ) : svgCode ? (
        <div ref={ref} dangerouslySetInnerHTML={{ __html: svgCode }} className="flex justify-center" />
      ) : (
        <div className="flex justify-center text-text-muted">Rendering diagram...</div>
      )}
    </div>
  );
};
