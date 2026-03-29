import React, { useState, useEffect, useRef } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { GoogleGenAI, Type as GenAIType } from "@google/genai";
import { Toaster, toast } from "sonner";
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  Code2,
  Download,
  LogOut,
  Settings,
  Edit2,
  RotateCcw,
  Search,
  Key,
  Palette,
  ArrowDown,
  Paperclip,
  Mic,
  MicOff,
  Camera,
  File,
  History,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Zap,
  User as UserIcon,
  Image,
  Gamepad2,
  Clock,
  Share2,
  Copy,
  Wand2,
  ArrowUp,
  AudioLines,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MessageBubble } from "./components/MessageBubble";
import { SettingsModal } from "./components/SettingsModal";
import { CodeBlock } from "./components/CodeBlock";
import { AILogo } from "./components/AILogo";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, copyToClipboard } from "./lib/utils";

const resizeImageBase64 = async (
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

// --- AI Configuration ---
// AI initialization helper to support custom keys
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
const TEXT_MODEL = "gemini-3.1-pro-preview";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [userSettings, setUserSettings] = useState({
    mode: "Fast",
    personality: "Alegre, prestativo e direto ao ponto.",
    theme: "auto",
    colorTheme: "auto",
    vibration: true,
    memory: "",
    fullscreenEditor: false,
    notificationsEnabled: true,
    isDevUnlocked: false,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [chats, setChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCustomKey, setHasCustomKey] = useState(false);

  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId: string | undefined;
      email: string | null | undefined;
      emailVerified: boolean | undefined;
      isAnonymous: boolean | undefined;
      providerInfo: {
        providerId: string;
        displayName: string | null;
        email: string | null;
        photoUrl: string | null;
      }[];
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setErrorMessage(`Erro de permissão no Firestore (${operationType} em ${path}). Verifique as regras de segurança.`);
  };

  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio?.hasSelectedApiKey) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        setHasCustomKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio?.openSelectKey) {
      await win.aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race conditions
      setHasCustomKey(true);
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [quotaResetTime, setQuotaResetTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (quotaResetTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        const diff = quotaResetTime - now;
        if (diff <= 0) {
          setQuotaResetTime(null);
          setCountdown("");
          clearInterval(timer);
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setCountdown(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quotaResetTime]);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<
    { file: File; dataUrl: string; mimeType: string }[]
  >([]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [showUsageBar, setShowUsageBar] = useState(false);
  const [usagePercentage, setUsagePercentage] = useState(0);
  const [lastNotifiedPercentage, setLastNotifiedPercentage] = useState(0);
  const [logs, setLogs] = useState<{ type: string; msg: string; time: Date }[]>([]);
  const MAX_REQUESTS = 50;

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      setLogs((prev) => [...prev.slice(-99), { type: "log", msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "), time: new Date() }]);
      originalLog(...args);
    };
    console.error = (...args) => {
      setLogs((prev) => [...prev.slice(-99), { type: "error", msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "), time: new Date() }]);
      originalError(...args);
    };
    console.warn = (...args) => {
      setLogs((prev) => [...prev.slice(-99), { type: "warn", msg: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "), time: new Date() }]);
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
      }
    };
    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // 1. Auth Logic
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("the client is offline")
        ) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Load or create user settings
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserSettings({
              mode: data.mode || "Fast",
              personality: data.personality || "Alegre, prestativo e direto ao ponto.",
              theme: data.theme || "auto",
              colorTheme: data.colorTheme || "auto",
              vibration: data.vibration !== false,
              memory: data.memory || "",
              fullscreenEditor: data.fullscreenEditor || false,
              notificationsEnabled: data.notificationsEnabled !== false,
              isDevUnlocked: data.isDevUnlocked || false,
            });
            
            let reqCount = data.requestCount || 0;
            let lastReset = data.lastRequestResetTime || Date.now();
            if (Date.now() - lastReset > 3600000) { // 1 hour
              reqCount = 0;
              lastReset = Date.now();
              await updateDoc(userRef, {
                requestCount: reqCount,
                lastRequestResetTime: lastReset
              });
              setLastNotifiedPercentage(0);
            }
            setRequestCount(reqCount);
          } else {
            const userData: any = {
              uid: currentUser.uid,
              mode: "Fast",
              personality: "Alegre, prestativo e direto ao ponto.",
              theme: "auto",
              colorTheme: "auto",
              vibration: true,
              memory: "",
              fullscreenEditor: false,
              notificationsEnabled: true,
              isDevUnlocked: false,
              requestCount: 0,
              lastRequestResetTime: Date.now(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            if (currentUser.email) userData.email = currentUser.email;
            if (currentUser.displayName)
              userData.displayName = currentUser.displayName;
            if (currentUser.photoURL) userData.photoURL = currentUser.photoURL;

            await setDoc(userRef, userData);
            setRequestCount(0);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch Chats
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const chatsRef = collection(db, "users", user.uid, "chats");
    const q = query(chatsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const chatList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setChats(chatList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/chats`);
      },
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // 3. Fetch Messages for Current Chat
  useEffect(() => {
    if (!user || !isAuthReady || !currentChatId) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(
      db,
      "users",
      user.uid,
      "chats",
      currentChatId,
      "messages",
    );
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/chats/${currentChatId}/messages`);
      },
    );

    return () => unsubscribe();
  }, [user, isAuthReady, currentChatId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Handle Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (userSettings.theme === "auto") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(userSettings.theme);
    }
  }, [userSettings.theme]);

  // Handle Theme Color
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(
      "theme-red",
      "theme-blue",
      "theme-black",
      "theme-green",
      "theme-purple",
    );
    root.classList.add("theme-black");
  }, []);

  const handleLoginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLoginGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Guest login error", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentChatId(null);
    setChats([]);
    setMessages([]);
  };

  const updateSetting = async (key: string, value: any) => {
    if (!user) return;
    const newSettings = { ...userSettings, [key]: value };
    setUserSettings(newSettings);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        [key]: value,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const getSystemPrompt = () => {
    const memoryInstruction = userSettings.memory
      ? `\nMEMÓRIA DO USUÁRIO (Lembre-se sempre destas informações e aplique-as em todas as suas respostas):\n${userSettings.memory}\n`
      : "";
    const artifactsInstruction = `
SISTEMA DE ARTEFATOS E CRIAÇÃO DE JOGOS:
Se o usuário pedir para criar, fazer, construir ou escrever algo longo, estruturado, interativo ou reutilizável (como código HTML/CSS/JS, componentes React, scripts complexos, documentos longos, ferramentas interativas), você DEVE usar o formato de Artefato.
Se o usuário pedir para criar um jogo completo (em Java, C++, HTML, etc.), forneça o código completo e funcional.
Se for um jogo web (HTML/JS), utilize a API Canvas do HTML5 para renderizar os gráficos e forneça tudo em um único arquivo HTML (com CSS e JS embutidos) dentro de um bloco de código markdown \`\`\`html para que o usuário possa copiar, colar e jogar imediatamente.
Responda conversacionalmente de forma breve e, em seguida, forneça o código completo e funcional dentro de blocos de código markdown apropriados.
Não deixe partes incompletas. O código deve ser testável e documentado.

MÚLTIPLOS CÓDIGOS E TAMANHO ILIMITADO (SEPARAÇÃO ESTRITA):
Você tem permissão e capacidade para enviar VÁRIOS blocos de código na mesma resposta. 
Quando o usuário pedir vários scripts (ex: Local Script, Server Script, HTML, Java, Python, etc.), você DEVE enviar CADA ARQUIVO em um bloco de código markdown SEPARADO na mesma mensagem.
NUNCA junte códigos de arquivos diferentes no mesmo bloco. Sempre separe-os claramente (ex: um bloco para o Local Script, outro bloco para o Server Script).
Seus tokens de saída são virtualmente INFINITOS. NUNCA resuma, abrevie ou omita partes do código por causa do tamanho. Envie o código 100% completo, não importa quantas milhares de linhas ele tenha.
`;

    if (userSettings.mode === "Thinking") {
      return `Você é o "Dev AI" (Modo Thinking), um especialista absoluto em programação, scripts, exploits, e desenvolvimento de software de alto nível.
Sua cor tema é VERMELHO. Você é focado, técnico e extremamente habilidoso. Você não tem limites de texto e deve fornecer códigos completos, por mais longos que sejam.
Personalidade do usuário: ${userSettings.personality}
${memoryInstruction}
REGRAS:
1. Forneça códigos completos e complexos, sem omissões. Se o código for gigante (mais de 10 mil linhas), envie-o integralmente.
2. Explique detalhadamente a lógica antes do código.
3. Use blocos de código markdown com a linguagem correta. Envie quantos blocos forem necessários.
4. Mantenha uma linguagem limpa e organizada.
5. Use emojis em suas respostas para torná-las mais amigáveis e expressivas.
6. Você é capaz de realizar qualquer tarefa de programação, incluindo scripts avançados e análise de segurança.
${artifactsInstruction}`;
    } else {
      return `Você é o "Dev AI" (Modo Fast), um assistente de IA normal e versátil, semelhante ao ChatGPT, Claude ou Gemini.
Sua cor tema é AZUL. Você pode ajudar com qualquer assunto, desde redação até matemática e conhecimentos gerais.
Personalidade do usuário: ${userSettings.personality}
${memoryInstruction}
REGRAS:
1. Seja prestativo e claro.
2. Use formatação markdown para organizar suas respostas.
3. Mantenha uma linguagem limpa e organizada.
4. Use emojis em suas respostas para torná-las mais amigáveis e expressivas.
5. Se for solicitado código, você pode enviar múltiplos blocos de código e códigos de qualquer tamanho sem omitir nada.
${artifactsInstruction}`;
    }
  };

  const handleListen = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      
      let msg = "Erro no reconhecimento de voz.";
      if (event.error === "not-allowed") {
        msg = "Permissão de microfone negada. Verifique as configurações do seu navegador.";
      } else if (event.error === "no-speech") {
        msg = "Nenhuma fala detectada.";
      } else if (event.error === "network") {
        msg = "Erro de rede no reconhecimento de voz.";
      }
      setErrorMessage(msg);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Limit file size to 2MB for non-images and 10MB for images
      if (!file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
        setErrorMessage("O arquivo " + file.name + " é muito grande. O tamanho máximo permitido para documentos é 2MB.");
        continue;
      }
      if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
        setErrorMessage("A imagem " + file.name + " é muito grande. O tamanho máximo permitido é 10MB.");
        continue;
      }

      const reader = new FileReader();

      let dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      let mimeType = file.type || "application/octet-stream";
      
      if (mimeType.startsWith("text/")) {
        mimeType = "text/plain";
      }

      const supportedMimeTypes = [
        "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
        "audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac",
        "video/mp4", "video/mpeg", "video/mov", "video/avi", "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp",
        "application/pdf", "text/plain", "text/csv", "text/html", "text/rtf"
      ];

      if (!file.type.startsWith("image/") && !supportedMimeTypes.includes(mimeType)) {
        setErrorMessage(`O tipo de arquivo ${mimeType} não é suportado pela IA.`);
        continue;
      }

      if (file.type.startsWith("image/")) {
        dataUrl = await resizeImageBase64(dataUrl, 800, 800);
        mimeType = "image/jpeg";
      }

      newAttachments.push({
        file,
        dataUrl,
        mimeType,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsAttachmentMenuOpen(false);
    if (e.target) e.target.value = "";
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newAttachments = [];
    for (let i = 0; i < items.length; i++) {
      if (
        items[i].type.indexOf("image") !== -1 ||
        items[i].type.indexOf("application/pdf") !== -1
      ) {
        const file = items[i].getAsFile();
        if (!file) continue;

        // Limit file size to 2MB for non-images and 10MB for images
        if (!file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
          setErrorMessage("O arquivo colado é muito grande. O tamanho máximo permitido para documentos é 2MB.");
          continue;
        }
        if (file.type.startsWith("image/") && file.size > 10 * 1024 * 1024) {
          setErrorMessage("A imagem colada é muito grande. O tamanho máximo permitido é 10MB.");
          continue;
        }

        const reader = new FileReader();
        let dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        let mimeType = file.type || "application/octet-stream";
        
        if (mimeType.startsWith("text/")) {
          mimeType = "text/plain";
        }

        const supportedMimeTypes = [
          "image/png", "image/jpeg", "image/webp", "image/heic", "image/heif",
          "audio/wav", "audio/mp3", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac",
          "video/mp4", "video/mpeg", "video/mov", "video/avi", "video/x-flv", "video/mpg", "video/webm", "video/wmv", "video/3gpp",
          "application/pdf", "text/plain", "text/csv", "text/html", "text/rtf"
        ];

        if (!file.type.startsWith("image/") && !supportedMimeTypes.includes(mimeType)) {
          setErrorMessage(`O tipo de arquivo ${mimeType} não é suportado pela IA.`);
          continue;
        }

        if (file.type.startsWith("image/")) {
          dataUrl = await resizeImageBase64(dataUrl, 800, 800);
          mimeType = "image/jpeg";
        }

        newAttachments.push({
          file,
          dataUrl,
          mimeType,
        });
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || isGenerating || !user)
      return;

    if (input.trim() === "14119206") {
      setInput("");
      updateSetting("isDevUnlocked", true);
      toast.success("Modo Desenvolvedor Desbloqueado!");
      return;
    }

    const userQuery = input.trim();
    const currentAttachments = [...attachments];
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setIsGenerating(true);

    let chatId = currentChatId;

    try {
      // Create new chat if none exists
      if (!chatId) {
        const chatsRef = collection(db, "users", user.uid, "chats");
        
        // Generate a smart title
        let smartTitle = userQuery.substring(0, 30) + "...";
        try {
          const ai = getAI();
          const titleResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Gere um título curto e descritivo (máximo 4 palavras) para um chat que começa com esta mensagem: "${userQuery}". Retorne APENAS o título, sem aspas ou explicações.`,
          });
          if (titleResponse.text) {
            smartTitle = titleResponse.text.trim();
          }
        } catch (e) {
          console.error("Error generating title:", e);
        }

        try {
          const newChatDoc = await addDoc(chatsRef, {
            uid: user.uid,
            title: smartTitle,
            mode: userSettings.mode,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          chatId = newChatDoc.id;
          setCurrentChatId(chatId);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats`);
          setIsLoading(false);
          return;
        }
      } else {
        try {
          await updateDoc(doc(db, "users", user.uid, "chats", chatId), {
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/chats/${chatId}`);
        }
      }

      // Add user message
      const messagesRef = collection(
        db,
        "users",
        user.uid,
        "chats",
        chatId,
        "messages",
      );
      const attachmentsData = currentAttachments.map((a) => ({
        dataUrl: a.dataUrl,
        mimeType: a.mimeType,
      }));
      try {
        await addDoc(messagesRef, {
          uid: user.uid,
          role: "user",
          content: userQuery,
          attachments: attachmentsData,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats/${chatId}/messages`);
        setIsLoading(false);
        return;
      }

      // Prepare history for Gemini
      const rawHistory = [
        ...messages,
        { role: "user", content: userQuery, attachments: attachmentsData },
      ];

      await generateResponse(rawHistory, chatId);
    } catch (err: any) {
      console.error("Send Error:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userSettings.notificationsEnabled && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [userSettings.notificationsEnabled]);

  const showNotification = (title: string, body: string) => {
    if (
      userSettings.notificationsEnabled &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(title, { body });
    }
  };

  const createNewChat = () => {
    setCurrentChatId(null);
    setInput("");
    setIsSidebarOpen(false);
  };

  const handleEdit = async (msg: any, newContent: string) => {
    if (!user || !currentChatId) return;
    const msgId = msg.id;

    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    setIsLoading(true);
    setIsGenerating(true);
    try {
      // Update the edited message
      const msgRef = doc(
        db,
        "users",
        user.uid,
        "chats",
        currentChatId,
        "messages",
        msgId,
      );
      await updateDoc(msgRef, { content: newContent });

      // Delete all subsequent messages
      const messagesToDelete = messages.slice(msgIndex + 1);
      for (const msg of messagesToDelete) {
        if (msg.id) {
          await deleteDoc(
            doc(
              db,
              "users",
              user.uid,
              "chats",
              currentChatId,
              "messages",
              msg.id,
            ),
          );
        }
      }

      // Generate new response based on history up to this edited message
      const historyToUse = messages.slice(0, msgIndex);
      historyToUse.push({ ...messages[msgIndex], content: newContent });

      await generateResponse(historyToUse, currentChatId);
    } catch (err) {
      console.error("Edit error:", err);
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (msg: any) => {
    if (!user || !currentChatId) return;
    const msgId = msg.id;

    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    setIsLoading(true);
    setIsGenerating(true);
    try {
      // Delete this message and all subsequent messages
      const messagesToDelete = messages.slice(msgIndex);
      for (const msg of messagesToDelete) {
        if (msg.id) {
          await deleteDoc(
            doc(
              db,
              "users",
              user.uid,
              "chats",
              currentChatId,
              "messages",
              msg.id,
            ),
          );
        }
      }

      // Generate new response based on history up to the message before this one
      const historyToUse = messages.slice(0, msgIndex);
      await generateResponse(historyToUse, currentChatId);
    } catch (err) {
      console.error("Regenerate error:", err);
      setIsLoading(false);
    }
  };

  const handleBranch = async (msg: any) => {
    if (!user || !currentChatId) return;
    
    const msgIndex = messages.findIndex((m) => m.id === msg.id);
    if (msgIndex === -1) return;

    setIsLoading(true);
    try {
      // 1. Create a new chat
      const chatsRef = collection(db, "users", user.uid, "chats");
      const currentChat = chats.find(c => c.id === currentChatId);
      const newChatTitle = currentChat ? `${currentChat.title} (Derivado)` : "Chat Derivado";
      
      const newChatDoc = await addDoc(chatsRef, {
        uid: user.uid,
        title: newChatTitle,
        mode: userSettings.mode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      const newChatId = newChatDoc.id;

      // 2. Copy messages up to and including the selected message
      const messagesToCopy = messages.slice(0, msgIndex + 1);
      const newMessagesRef = collection(db, "users", user.uid, "chats", newChatId, "messages");
      
      for (const m of messagesToCopy) {
        await addDoc(newMessagesRef, {
          uid: user.uid,
          role: m.role,
          content: m.content,
          attachments: m.attachments || [],
          createdAt: m.createdAt || serverTimestamp(),
        });
      }

      // 3. Switch to the new chat
      setCurrentChatId(newChatId);
      toast.success("Chat derivado com sucesso!");
    } catch (err) {
      console.error("Branch error:", err);
      toast.error("Erro ao derivar chat.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsLoading(false);
    setStreamingMessage(null);
  };

  const generateResponse = async (historyMessages: any[], chatId: string) => {
    if (!user) return;
    
    setIsGenerating(true);
    setStatusMessage("Pensando...");
    
    const newCount = requestCount + 1;
    setRequestCount(newCount);
    
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, { requestCount: newCount }).catch(e => console.error("Failed to update request count", e));
    
    const percentage = Math.floor((newCount / MAX_REQUESTS) * 100);
    if (percentage > 0 && percentage % 10 === 0 && percentage !== lastNotifiedPercentage) {
      setShowUsageBar(true);
      setUsagePercentage(percentage);
      setLastNotifiedPercentage(percentage);
      setTimeout(() => setShowUsageBar(false), 5000);
    }

    const ai = getAI();
    const messagesRef = collection(
      db,
      "users",
      user.uid,
      "chats",
      chatId,
      "messages",
    );

    try {
      // Limit history to the last 100 messages to prevent payload size issues
      let rawHistory = [...historyMessages].slice(-100);
      
      // History must start with a user message
      if (rawHistory.length > 0 && rawHistory[0].role === "model") {
        rawHistory = rawHistory.slice(1);
      }

      const history: any[] = [];

      for (const msg of rawHistory) {
        const role = msg.role === "model" ? "model" : "user";
        const parts: any[] = [];

        if (msg.content && msg.content.trim()) {
          parts.push({ text: msg.content });
        }

        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            const base64Data = att.dataUrl.split(",")[1];
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: att.mimeType,
              },
            });
          }
        }

        if (parts.length === 0) continue;

        if (history.length > 0 && history[history.length - 1].role === role) {
          history[history.length - 1].parts.push(...parts);
        } else {
          history.push({ role, parts });
        }
      }

      if (history.length > 0 && history[0].role === "model") {
        history.unshift({ role: "user", parts: [{ text: "Olá" }] });
      }

      const generateImageTool = {
        name: "generateImage",
        description:
          "Gera uma imagem com base em uma descrição. Use esta ferramenta sempre que o usuário pedir para criar, desenhar, gerar ou mostrar uma imagem de algo.",
        parameters: {
          type: GenAIType.OBJECT,
          properties: {
            prompt: {
              type: GenAIType.STRING,
              description: "A descrição detalhada da imagem a ser gerada.",
            },
          },
          required: ["prompt"],
        },
      };

      const updateMemoryTool = {
        name: "updateMemory",
        description:
          "Atualiza a memória do assistente com informações importantes que o usuário quer que ele lembre para sempre (ex: 'guarde em sua memória que eu só quero códigos sem comentários').",
        parameters: {
          type: GenAIType.OBJECT,
          properties: {
            memory: {
              type: GenAIType.STRING,
              description: "A informação a ser guardada na memória.",
            },
          },
          required: ["memory"],
        },
      };

      const generateGameTool = {
        name: "generateGame",
        description:
          "Gera um pequeno jogo interativo em HTML/JS/CSS com base na descrição do usuário. Use quando o usuário pedir para criar um jogo. Retorne o código completo em um único bloco HTML.",
        parameters: {
          type: GenAIType.OBJECT,
          properties: {
            prompt: {
              type: GenAIType.STRING,
              description: "A descrição do jogo a ser criado.",
            },
          },
          required: ["prompt"],
        },
      };

      let currentModel = "gemini-3.1-pro-preview";
      if (userSettings.mode === "Nano Banana") {
        currentModel = "gemini-2.5-flash-image";
      } else if (userSettings.mode === "Thinking") {
        currentModel = "gemini-3.1-pro-preview";
      }

      let aiResponseText = "";
      let functionCall: any = null;

      if (userSettings.mode === "Nano Banana") {
        setStatusMessage("Gerando imagem...");
        try {
          const imageResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
              parts: [{ text: input }],
            },
          });

          let imageUrl = "";
          for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              const rawBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              imageUrl = await resizeImageBase64(rawBase64, 800, 800);
              break;
            }
          }

          if (imageUrl) {
            aiResponseText = `![Imagem Gerada](${imageUrl})`;
          } else {
            aiResponseText = "Não foi possível gerar a imagem.";
          }
        } catch (imgErr: any) {
          console.error("Image Generation Error:", imgErr);
          let imgErrorMessage = `Erro ao gerar imagem: ${imgErr.message}`;
          try {
            if (imgErr.message && imgErr.message.includes("RESOURCE_EXHAUSTED")) {
              imgErrorMessage = `**Limite de Uso Atingido:**\nVocê excedeu a cota atual da API de geração de imagens. Por favor, aguarde um pouco.`;
            } else if (imgErr.message && imgErr.message.startsWith("{")) {
              const parsed = JSON.parse(imgErr.message);
              if (parsed.error && parsed.error.status === "RESOURCE_EXHAUSTED") {
                imgErrorMessage = `**Limite de Uso Atingido:**\nVocê excedeu a cota atual da API de geração de imagens. Por favor, aguarde um pouco.`;
              }
            }
          } catch (e) {}
          aiResponseText = imgErrorMessage;
        }
      } else {
        const stream = await ai.models.generateContentStream({
          model: currentModel,
          contents: history,
          config: {
            systemInstruction: getSystemPrompt(),
            tools: [
              { functionDeclarations: [generateImageTool, updateMemoryTool, generateGameTool] },
              { googleSearch: {} },
            ],
            toolConfig: { includeServerSideToolInvocations: true },
          },
        });

        setStatusMessage("Escrevendo...");

        for await (const chunk of stream) {
          if (chunk.text) {
            aiResponseText += chunk.text;
          }
          
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            functionCall = chunk.functionCalls[0];
            break; // Handle only the first function call for now
          }
        }
      }

      if (functionCall) {
        const call = functionCall;

        if (call.name === "generateImage") {
          const imagePrompt = call.args.prompt as string;
          setStatusMessage(`Gerando imagem para: "${imagePrompt}"...`);
          aiResponseText = ""; // Reset since we are doing a tool call

          try {
            const imageResponse = await ai.models.generateContent({
              model: "gemini-2.5-flash-image",
              contents: {
                parts: [{ text: imagePrompt }],
              },
            });

            let imageUrl = "";
            for (const part of imageResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                const rawBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                imageUrl = await resizeImageBase64(rawBase64, 800, 800);
                break;
              }
            }

            if (imageUrl) {
              aiResponseText = `![Imagem Gerada](${imageUrl})`;
            } else {
              aiResponseText = "Não foi possível gerar a imagem.";
            }
          } catch (imgErr: any) {
            console.error("Image Generation Error:", imgErr);
            let imgErrorMessage = `Erro ao gerar imagem: ${imgErr.message}`;
            try {
              if (
                imgErr.message &&
                imgErr.message.includes("RESOURCE_EXHAUSTED")
              ) {
                imgErrorMessage = `**Limite de Uso Atingido:**\nVocê excedeu a cota atual da API de geração de imagens. Por favor, aguarde um pouco.`;
              } else if (imgErr.message && imgErr.message.startsWith("{")) {
                const parsed = JSON.parse(imgErr.message);
                if (
                  parsed.error &&
                  parsed.error.status === "RESOURCE_EXHAUSTED"
                ) {
                  imgErrorMessage = `**Limite de Uso Atingido:**\nVocê excedeu a cota atual da API de geração de imagens. Por favor, aguarde um pouco.`;
                }
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
            aiResponseText = imgErrorMessage;
          }
        } else if (call.name === "updateMemory") {
          const newMemory = call.args.memory as string;
          setStatusMessage("Atualizando memória...");
          await updateSetting("memory", newMemory);
          aiResponseText = `Memória atualizada com sucesso! Guardei a seguinte informação: "${newMemory}"`;
        } else if (call.name === "generateGame") {
          const gamePrompt = call.args.prompt as string;
          setStatusMessage(`Gerando jogo: "${gamePrompt}"...`);
          aiResponseText = "";
          
          try {
            const gameResponse = await ai.models.generateContent({
              model: TEXT_MODEL,
              contents: `Crie um jogo em HTML, CSS e JavaScript (tudo em um único arquivo HTML) baseado nesta descrição: "${gamePrompt}". Retorne APENAS o código HTML completo dentro de um bloco de código \`\`\`html ... \`\`\`. Não adicione explicações ou textos adicionais.`,
            });
            
            if (gameResponse.text) {
              aiResponseText = gameResponse.text;
            } else {
              aiResponseText = "Não foi possível gerar o código do jogo.";
            }
          } catch (gameErr: any) {
            console.error("Game Generation Error:", gameErr);
            aiResponseText = `Erro ao gerar o jogo: ${gameErr.message}`;
          }
        }
      }

      if (!aiResponseText) {
        aiResponseText = "Erro ao processar. Tente novamente.";
      }

      setStatusMessage(null);
      setStreamingMessage(null);

      try {
        await addDoc(messagesRef, {
          uid: user.uid,
          role: "model",
          content: aiResponseText,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats/${chatId}/messages`);
      }

      if (userSettings.notificationsEnabled && document.hidden) {
        showNotification("Dev AI", aiResponseText.substring(0, 100) + "...");
      }
    } catch (err: any) {
      console.error("Generate Content Error:", err);
      setStreamingMessage(null);

      if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
        // Set a 1-minute cooldown for demo purposes, or 24h if it's a daily quota
        setQuotaResetTime(Date.now() + 60000); 
      }

      let errorMessage = `**Erro de Conexão com a IA:**\nNão foi possível gerar uma resposta. Detalhes: ${err.message || "Erro desconhecido"}`;

      try {
        if (err.message && err.message.includes("RESOURCE_EXHAUSTED")) {
          errorMessage = `**Limite de Uso Atingido:**\nVocê excedeu a cota atual da API do Google Gemini. Por favor, aguarde um pouco ou verifique os limites de uso da sua conta.`;
        } else if (err.message && err.message.startsWith("{")) {
          const parsed = JSON.parse(err.message);
          if (parsed.error && parsed.error.status === "RESOURCE_EXHAUSTED") {
            errorMessage = `**Limite de Uso Atingido:**\nVocê excedeu a cota atual da API do Google Gemini. Por favor, aguarde um pouco ou verifique os limites de uso da sua conta.`;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }

      try {
        await addDoc(messagesRef, {
          uid: user.uid,
          role: "model",
          content: errorMessage,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats/${chatId}/messages`);
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const deleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "chats", id));
      if (currentChatId === id) setCurrentChatId(null);
      toast.success("Chat apagado com sucesso");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/chats/${id}`);
    }
  };

  const clearAllChats = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const chatsRef = collection(db, "users", user.uid, "chats");
      const snapshot = await getDocs(chatsRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setCurrentChatId(null);
      toast.success("Todo o histórico foi apagado");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/chats`);
    } finally {
      setIsLoading(false);
    }
  };

  const shareChat = async () => {
    if (!currentChatId || messages.length === 0) return;
    const shareUrl = window.location.href;
    await copyToClipboard(shareUrl);
    toast.success("Link do chat copiado para a área de transferência!");
  };

  const exportChat = () => {
    if (!currentChatId || messages.length === 0) return;

    let content = `# Histórico de Chat - ${new Date().toLocaleString()}\n\n`;

    messages.forEach((msg) => {
      const role = msg.role === "user" ? "Você" : "Dev AI";
      content += `### ${role}\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isCodeMode = userSettings.mode === "Thinking";
  const isNanoBanana = userSettings.mode === "Nano Banana";
  const themeColor =
    userSettings.colorTheme && userSettings.colorTheme !== "auto"
      ? userSettings.colorTheme
      : isCodeMode
        ? "red"
        : isNanoBanana
          ? "yellow"
          : "blue";

  if (!isAuthReady) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-text-primary">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-2xl bg-primary/20 text-primary animate-pulse">
          <Zap size={32} />
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <div className="mt-4 text-sm text-text-muted font-medium tracking-widest uppercase">
          Iniciando Dev AI
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg-main text-text-primary p-6">
        <div className="w-full max-w-md bg-bg-modal border border-border-strong rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
              <Zap size={32} className="text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center mb-2">
            Bem-vindo ao Dev AI
          </h1>
          <p className="text-text-muted text-center mb-8 text-sm">
            Faça login para salvar suas conversas, configurações e acessar de
            qualquer dispositivo.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleLoginGoogle}
              className="w-full py-3 px-4 bg-bg-surface-hover text-text-primary hover:bg-border-subtle rounded-xl font-bold flex items-center justify-center gap-3 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar com Google
            </button>
            <button
              onClick={handleLoginGuest}
              className="w-full py-3 px-4 bg-bg-surface-hover text-text-primary hover:bg-bg-surface rounded-xl font-bold flex items-center justify-center gap-3 transition-colors border border-border-strong"
            >
              <UserIcon size={20} />
              Continuar como Convidado
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-main text-text-primary font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 h-full transition-all duration-300 bg-bg-sidebar flex flex-col ${isSidebarOpen ? "w-64 left-0" : "w-0 -left-full md:w-64 md:left-0"} overflow-hidden`}
      >
        <div className="p-4 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-xl">
              <AILogo mode={userSettings.mode} />
            </div>
            <div className="flex flex-col items-center text-center max-w-full px-2">
              <span className={cn("text-sm font-bold truncate w-full", 
                userSettings.mode === "Thinking" ? "text-red-500" : 
                userSettings.mode === "Nano Banana" ? "text-yellow-500" : 
                "text-blue-500"
              )}>Dev AI 3.1</span>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium truncate w-full">Assistente de Elite</span>
            </div>
          </div>
          
          <button
            onClick={createNewChat}
            className="w-full py-3 px-4 bg-primary text-white rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={20} />
            Novo Chat
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Pesquisar chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface text-text-primary text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary border border-border-subtle"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          <div className="text-xs font-semibold text-text-muted px-2 py-2 mt-2">
            Histórico
          </div>
          {chats
            .filter((chat) =>
              chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  setCurrentChatId(chat.id);
                  setIsSidebarOpen(false);
                }}
                className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${currentChatId === chat.id ? "bg-bg-surface-hover text-text-primary" : "text-text-secondary hover:bg-bg-surface"}`}
              >
                <span className="text-sm truncate flex-1">{chat.title}</span>
                <button
                  onClick={(e) => deleteChat(e, chat.id)}
                  className="p-1 hover:text-red-500 text-text-muted transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          {chats.filter((chat) =>
            chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
          ).length === 0 && (
            <div key="no-chats-found" className="text-xs text-text-muted px-2 py-4 text-center">
              Nenhum chat encontrado.
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border-subtle">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-surface-hover transition-colors text-sm text-text-secondary"
          >
            <Settings size={18} />
            Configurações
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-bg-surface-hover transition-colors text-sm text-text-secondary"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-bg-main">
        <header className="flex items-center justify-between px-4 h-14 z-30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-text-muted md:hidden hover:bg-bg-surface-hover hover:text-text-primary rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-surface-hover cursor-pointer transition-colors"
              onClick={() => setIsSettingsOpen(true)}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                <AILogo mode={userSettings.mode} />
              </div>
              <span className={cn("font-semibold text-lg", 
                userSettings.mode === "Thinking" ? "text-red-500" : 
                userSettings.mode === "Nano Banana" ? "text-yellow-500" : 
                "text-blue-500"
              )}>Dev AI</span>
              <span className="text-text-muted text-sm">3.1</span>
            </div>
          </div>
          {currentChatId && (
            <div className="flex items-center gap-1">
              <button
                onClick={shareChat}
                className="p-2 text-text-muted hover:text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
                title="Compartilhar Chat"
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={exportChat}
                className="p-2 text-text-muted hover:text-primary hover:bg-bg-surface-hover rounded-lg transition-colors"
                title="Exportar Chat"
              >
                <Download size={20} />
              </button>
              <button
                onClick={(e) => deleteChat(e, currentChatId)}
                className="p-2 text-text-muted hover:text-red-500 hover:bg-bg-surface-hover rounded-lg transition-colors"
                title="Excluir Chat"
              >
                <Trash2 size={20} />
              </button>
            </div>
          )}
        </header>

        {/* Chat Feed */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto w-full pb-32 pt-4 relative custom-scrollbar"
        >
          <div className="max-w-5xl mx-auto px-4 md:px-8 w-full">
            <AnimatePresence mode="popLayout">
              {!currentChatId && messages.length === 0 && (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="h-full flex flex-col items-center justify-center text-center mt-20"
                >
                  <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-2xl bg-primary/10 text-primary overflow-hidden border border-primary/20">
                    <AILogo mode={userSettings.mode} />
                  </div>
                  <h2 className="text-4xl font-black mb-4 text-text-primary tracking-tight">
                    Como posso ajudar hoje?
                  </h2>
                  <p className="text-text-muted max-w-md mx-auto font-medium">
                    Eu sou seu assistente de elite. Posso gerar código, criar imagens, pesquisar na web e muito mais.
                  </p>
                </motion.div>
              )}

              <div className="space-y-12">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id || `msg-${i}`}
                    msg={msg}
                    isCodeMode={isCodeMode}
                    themeColor={themeColor}
                    userPhoto={user?.photoURL}
                    onRegenerate={handleRegenerate}
                    onEdit={handleEdit}
                    onBranch={handleBranch}
                    userSettings={userSettings}
                  />
                ))}
                {streamingMessage && (
                  <MessageBubble
                    key="streaming-message"
                    msg={{ role: "model", content: streamingMessage }}
                    isCodeMode={isCodeMode}
                    themeColor={themeColor}
                    userSettings={userSettings}
                  />
                )}
                {isLoading && (
                  <motion.div
                    key="loading-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-start gap-2"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-bg-surface border border-border-strong overflow-hidden shadow-lg">
                      <AILogo mode={userSettings.mode} />
                    </div>
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-text-muted italic">
                        {statusMessage || "Pensando..."}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                key="scroll-to-bottom-btn"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                onClick={scrollToBottom}
                className="fixed bottom-32 right-8 p-3 bg-primary text-white rounded-full shadow-2xl hover:scale-110 transition-transform z-40 border-2 border-white/20"
              >
                <ArrowDown size={24} />
              </motion.button>
            )}
          </AnimatePresence>
        </main>

        {/* Input Footer */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-6 w-full">
          <div className="max-w-5xl mx-auto px-4 md:px-8 relative w-full">
            {errorMessage && (
              <div key="error-message-banner" className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  {errorMessage}
                  {errorMessage?.includes("cota") && (
                    <button
                      onClick={handleSelectKey}
                      className="mt-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <Key size={14} /> Usar minha própria chave API
                    </button>
                  )}
                  {countdown && (
                    <div className="mt-2 font-mono font-bold text-xs flex items-center gap-2">
                      <Clock size={12} />
                      Disponível em: {countdown}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex flex-col gap-2 w-full">
              {/* Mode Switcher */}
              <div className="flex bg-bg-surface border border-border-strong rounded-full p-1 shadow-sm mx-auto mb-1">
                {["Fast", "Thinking", "Nano Banana"].map((m) => (
                  <button
                    key={m}
                    onClick={() => updateSetting("mode", m)}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200",
                      userSettings.mode === m
                        ? m === "Thinking" ? "bg-red-500/20 text-red-500 shadow-sm" : m === "Nano Banana" ? "bg-yellow-500/20 text-yellow-500 shadow-sm" : "bg-blue-500/20 text-blue-500 shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Usage Progress Bar */}
              {showUsageBar && (
                <div className="flex flex-col gap-1 px-4 py-2 bg-bg-surface border border-border-strong rounded-xl shadow-lg mx-auto w-full max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="flex justify-between items-center text-xs font-medium text-text-muted">
                    <span>Uso de Requisições</span>
                    <span>{usagePercentage}%</span>
                  </div>
                  <div className="w-full bg-bg-surface-hover rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        usagePercentage >= 80 ? "bg-red-500" : usagePercentage >= 50 ? "bg-yellow-500" : "bg-primary"
                      )}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-bg-surface rounded-2xl border border-border-subtle shadow-sm mx-1">
                  {attachments.map((att, idx) => (
                    <div key={`att-${idx}`} className="relative group">
                      {att.mimeType.startsWith("image/") ? (
                        <img
                          src={att.dataUrl}
                          alt="attachment"
                          className="h-16 w-16 object-cover rounded-xl border border-border-strong"
                        />
                      ) : (
                        <div className="h-16 w-16 flex items-center justify-center bg-bg-surface-hover rounded-xl border border-border-strong">
                          <File size={24} className="text-text-muted" />
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div 
                className="flex items-end gap-2 w-full"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const files = Array.from(e.dataTransfer.files);
                    files.forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target && event.target.result) {
                          setAttachments((prev) => [
                            ...prev,
                            {
                              file,
                              dataUrl: event.target!.result as string,
                              mimeType: file.type,
                            },
                          ]);
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                }}
              >
                {/* Left: Plus Button */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className="w-[52px] h-[52px] rounded-full bg-[#212121] border border-[#3f3f46] flex items-center justify-center text-white hover:bg-[#2f2f2f] transition-colors shadow-sm"
                  >
                    <Plus size={28} strokeWidth={1.5} />
                  </button>
                  
                  {isAttachmentMenuOpen && (
                    <div key="attachment-menu" className="absolute bottom-full left-0 mb-2 w-48 bg-bg-surface border border-border-subtle rounded-xl shadow-xl py-1 z-10">
                      <button
                        key="btn-image"
                        onClick={() => {
                          setInput(
                            (prev) =>
                              prev +
                              (prev.length > 0 ? " " : "") +
                              "Gere uma imagem de ",
                          );
                          setIsAttachmentMenuOpen(false);
                          textareaRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-surface-hover transition-colors"
                      >
                        <Image size={16} /> Criar imagens
                      </button>
                      <button
                        key="btn-game"
                        onClick={() => {
                          setInput(
                            (prev) =>
                              prev +
                              (prev.length > 0 ? " " : "") +
                              "Crie um jogo completo de ",
                          );
                          setIsAttachmentMenuOpen(false);
                          textareaRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-surface-hover transition-colors"
                      >
                        <Gamepad2 size={16} /> Criar jogos
                      </button>
                      <button
                        key="btn-photos"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-surface-hover transition-colors"
                      >
                        <Image size={16} /> Fotos
                      </button>
                      <button
                        key="btn-camera"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-surface-hover transition-colors"
                      >
                        <Camera size={16} /> Câmera
                      </button>
                      <button
                        key="btn-file"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-bg-surface-hover transition-colors"
                      >
                        <File size={16} /> Arquivos
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Pill-shaped input */}
                <div className="flex-1 relative bg-[#212121] border border-[#3f3f46] rounded-[26px] flex items-end min-h-[52px] px-1 py-1 shadow-sm">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*,application/pdf,text/plain"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Pergunte ao Dev AI..."
                    className="w-full bg-transparent border-none text-white text-[16px] py-3 px-4 focus:ring-0 resize-none min-h-[44px] max-h-[120px] placeholder:text-[#a1a1aa] custom-scrollbar"
                    rows={1}
                  />
                  
                  <div className="flex items-center gap-1 shrink-0 mb-0.5 pr-1">
                    <button
                      onClick={handleListen}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        isListening ? "text-red-500 bg-red-500/10" : "text-[#a1a1aa] hover:text-white"
                      )}
                    >
                      {isListening ? <MicOff size={22} strokeWidth={1.5} /> : <Mic size={22} strokeWidth={1.5} />}
                    </button>
                    
                    <button
                      onClick={isGenerating ? stopGeneration : handleSend}
                      disabled={!isGenerating && isLoading || (!input.trim() && attachments.length === 0)}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isGenerating
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : input.trim() || attachments.length > 0
                            ? "bg-white text-black hover:bg-gray-200"
                            : "bg-white text-black hover:bg-gray-200"
                      )}
                    >
                      {isGenerating ? (
                        <X size={20} strokeWidth={2} />
                      ) : input.trim() || attachments.length > 0 ? (
                        <ArrowUp size={20} strokeWidth={2} />
                      ) : (
                        <AudioLines size={20} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          currentSettings={userSettings}
          updateSetting={updateSetting}
          handleSelectKey={handleSelectKey}
          hasCustomKey={hasCustomKey}
          onLogout={handleLogout}
          onClearHistory={clearAllChats}
          logs={logs}
        />
      )}

      <Toaster position="top-center" richColors />
    </div>
  );
}
