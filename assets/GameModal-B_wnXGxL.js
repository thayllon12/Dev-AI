import{c as k,r as s,R as z,j as e,a as b,N as S,X as F,d as v}from"./index-CDA7g5Y4.js";import{C as j}from"./check-DAYpd8O9.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"M12 19h8",key:"baeox8"}],["path",{d:"m4 17 6-6-6-6",key:"1yngyt"}]],y=k("terminal",R);function D({code:N,onClose:l,userSettings:M}){const i=s.useRef(null),[m,I]=s.useState(N),[P,$]=s.useState(""),[G,O]=s.useState(!1),[a,x]=s.useState([]),[o,C]=s.useState(!1),[c,d]=s.useState(0),[h,p]=s.useState(null),g=(t,n)=>{navigator.clipboard.writeText(n),p(t),setTimeout(()=>p(null),2e3)},w=z.useMemo(()=>`
<script>
  (function() {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    function sendLog(level, args) {
      try {
        const message = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        window.parent.postMessage({ type: 'game-console', level, message }, '*');
      } catch (e) {}
    }

    console.error = function() {
      sendLog('error', arguments);
      originalConsoleError.apply(console, arguments);
    };
    console.warn = function() {
      sendLog('warn', arguments);
      originalConsoleWarn.apply(console, arguments);
    };
    console.log = function() {
      sendLog('log', arguments);
      originalConsoleLog.apply(console, arguments);
    };
    window.onerror = function(message, source, lineno, colno, error) {
      sendLog('error', [\`\${message} at \${source}:\${lineno}:\${colno}\`]);
      return false;
    };
    window.addEventListener('unhandledrejection', function(event) {
      sendLog('error', ['Unhandled Rejection:', event.reason]);
    });
  })();
<\/script>
`+m,[m]);s.useEffect(()=>{const t=n=>{var r;if(((r=n.data)==null?void 0:r.type)==="game-console"){const{level:f,message:L}=n.data;x(u=>[...u,{id:Date.now()+Math.random(),level:f,message:L}]),f==="error"&&!o&&d(u=>u+1)}};return window.addEventListener("message",t),()=>window.removeEventListener("message",t)},[o]),s.useEffect(()=>{o&&d(0)},[o]),s.useEffect(()=>{const t=document.documentElement;t.requestFullscreen&&t.requestFullscreen().catch(()=>{});const n=()=>{document.fullscreenElement||l()};document.addEventListener("fullscreenchange",n),window.history.pushState({gameMode:!0},"");const r=()=>{document.fullscreenElement&&document.exitFullscreen&&document.exitFullscreen().catch(()=>{}),l()};return window.addEventListener("popstate",r),()=>{document.removeEventListener("fullscreenchange",n),window.removeEventListener("popstate",r),document.fullscreenElement&&document.exitFullscreen&&document.exitFullscreen().catch(()=>{})}},[l]);const E=()=>{i.current&&(i.current.srcdoc=w,x([]),d(0))};return e.jsxs("div",{className:"fixed inset-0 bg-black z-[9999] flex flex-col animate-in zoom-in duration-300",children:[e.jsxs("div",{className:"absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/10",children:[e.jsxs("button",{onClick:()=>C(!o),className:b("p-2 rounded-xl transition-colors relative",o?"bg-white/20 text-white":"text-white/70 hover:text-white hover:bg-white/10"),title:"Console de Erros",children:[e.jsx(y,{size:18}),c>0&&!o&&e.jsx("span",{className:"absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center",children:c>9?"9+":c})]}),e.jsx("div",{className:"w-px h-5 bg-white/20 mx-1"}),e.jsx("button",{onClick:E,className:"p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors",title:"Recarregar",children:e.jsx(S,{size:18})}),e.jsx("button",{onClick:l,className:"p-2 text-white/70 hover:text-white hover:bg-red-500/80 rounded-xl transition-colors",title:"Fechar",children:e.jsx(F,{size:20})})]}),o&&e.jsxs("div",{className:"absolute top-20 right-4 w-[calc(100vw-32px)] sm:w-[450px] max-h-[70vh] bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4",children:[e.jsxs("div",{className:"flex items-center justify-between p-3 border-b border-white/10 bg-neutral-950/50",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(y,{size:16,className:"text-white/50"}),e.jsx("span",{className:"text-white/80 text-sm font-semibold tracking-wide",children:"Console do Jogo"})]}),a.length>0&&e.jsx("button",{onClick:()=>g("all",a.map(t=>t.message).join(`
`)),className:"p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors",title:"Copiar todos os erros",children:h==="all"?e.jsx(j,{size:14}):e.jsx(v,{size:14})})]}),e.jsx("div",{className:"overflow-y-auto p-2 flex-1 font-mono text-[11px] leading-relaxed flex flex-col gap-1 max-h-[60vh] custom-scrollbar",children:a.length===0?e.jsx("div",{className:"text-white/30 p-2 text-center",children:"Nenhum log capturado."}):a.map(t=>e.jsxs("div",{className:b("px-2 py-1.5 rounded-lg border flex flex-col gap-1 break-words relative group",t.level==="error"?"bg-red-500/10 border-red-500/20 text-red-400":t.level==="warn"?"bg-yellow-500/10 border-yellow-500/20 text-yellow-400":"bg-white/5 border-transparent text-white/70"),children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"opacity-50 text-[10px] uppercase font-bold",children:t.level}),e.jsx("button",{onClick:()=>g(t.id,t.message),className:"opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-current",title:"Copiar log",children:h===t.id?e.jsx(j,{size:12}):e.jsx(v,{size:12})})]}),e.jsx("span",{className:"whitespace-pre-wrap",children:t.message})]},t.id))})]}),e.jsx("div",{className:"flex-1 bg-white relative w-full h-full",children:e.jsx("iframe",{ref:i,srcDoc:w,className:"w-full h-full border-none",title:"Game Preview",sandbox:"allow-scripts allow-modals allow-popups allow-same-origin allow-pointer-lock"})})]})}export{D as GameModal};
