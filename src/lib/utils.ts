import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const copyToClipboard = async (text: string) => {
  const fallbackCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }
    document.body.removeChild(textArea);
  };

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy();
    }
  } catch (err) {
    fallbackCopy();
  }
};

export function guessLanguage(code: string): string {
  const trimmed = code.trim();
  if (/(<html|<head|<body|<div|<p|<span|<a |<button|<input)/i.test(trimmed)) {
    return "html";
  }
  if (/^\s*</.test(trimmed) && /<\/\w+>$/.test(trimmed)) {
    if (/html/i.test(trimmed) || /body/i.test(trimmed)) return "html";
    return "xml";
  }
  if (/^import\s+.*from\s+['"]/m.test(trimmed) || /^export\s+/m.test(trimmed) || /const\s+\w+\s*=/m.test(trimmed) || /let\s+\w+\s*=/m.test(trimmed) || /function\s+\w+\s*\(/m.test(trimmed)) {
    if (/<[A-Z][a-zA-Z0-9]*\s*[^>]*>/.test(trimmed) || /className=/.test(trimmed)) return "tsx";
    if (/<div|<span|<p/.test(trimmed)) return "jsx";
    return "javascript";
  }
  if (/def\s+\w+\s*\(/m.test(trimmed) || (/import\s+[a-z_]+/m.test(trimmed) && !/from/m.test(trimmed))) return "python";
  if (/public\s+class\s+/m.test(trimmed) || /System\.out\.println/m.test(trimmed)) return "java";
  if (/#include\s+</m.test(trimmed)) return "cpp";
  if (/^SELECT\s+/im.test(trimmed) || /^CREATE\s+TABLE/im.test(trimmed)) return "sql";
  if (/^[\w-]+\s*:\s*.+/m.test(trimmed) && !/\{/.test(trimmed)) return "yaml";
  if (/^\{.*\}$/s.test(trimmed) && /"\w+"\s*:/.test(trimmed)) return "json";
  if (/^body\s*\{/im.test(trimmed) || /^[.#][\w-]+\s*\{/m.test(trimmed) || /[.#][\w-]+\s*\{/m.test(trimmed)) return "css";
  if (/^#\s/.test(trimmed) || /^##\s/.test(trimmed) || /\[.*\]\(.*\)/.test(trimmed)) return "markdown";
  if (/^#!/m.test(trimmed) || /echo\s+/.test(trimmed)) return "bash";
  if (/(print\(|console\.log)/.test(trimmed)) return "javascript";
  return "text";
}
