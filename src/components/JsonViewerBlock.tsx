import React, { useState } from 'react';
import ReactJson from 'react-json-view';

interface JsonViewerBlockProps {
  jsonString: string;
  theme?: string;
}

export const JsonViewerBlock: React.FC<JsonViewerBlockProps> = ({ jsonString, theme }) => {
  const [parsed, setParsed] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      const obj = JSON.parse(jsonString);
      setParsed(obj);
      setError(null);
    } catch (e: any) {
      setParsed(null);
      setError(e.message || "Invalid JSON");
    }
  }, [jsonString]);

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl overflow-x-auto text-sm font-mono">
        <strong>Error parsing JSON:</strong> {error}
        <pre className="mt-2 text-xs opacity-70 whitespace-pre-wrap">{jsonString}</pre>
      </div>
    );
  }

  if (!parsed) return null;

  return (
    <div className="my-4 p-4 bg-bg-surface border border-border-strong rounded-xl overflow-x-auto">
      <ReactJson 
        src={parsed} 
        theme={theme === 'light' ? 'rjv-default' : 'twilight'}
        style={{ backgroundColor: 'transparent' }}
        displayDataTypes={false}
        displayObjectSize={true}
        enableClipboard={true}
        collapsed={2}
      />
    </div>
  );
};
