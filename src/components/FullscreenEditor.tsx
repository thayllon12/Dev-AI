import React from "react";
import { CanvasWorkspace } from "./CanvasWorkspace";

export function FullscreenEditor({
  code,
  language,
  onClose,
  userSettings
}: {
  code: string;
  language: string;
  onClose: () => void;
  fullMessageContent?: string;
  onAskAI?: (code: string) => void;
  userSettings?: any;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col">
       <CanvasWorkspace code={code} language={language} onClose={onClose} userSettings={userSettings} />
    </div>
  );
}
