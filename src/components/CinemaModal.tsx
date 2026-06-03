// @ts-nocheck
import React, { useState, useRef, useEffect } from "react";
import { X, Play, Plus, Info, Home, Search, Folder, Download, Settings, Menu, ChevronRight, Users } from "lucide-react";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "motion/react";

interface CinemaModalProps {
  onClose: () => void;
  initialQuery?: string;
  onAskAI?: (query: string) => void;
}

const MOCK_HERO = {
  title: "The Americans",
  category: "Crime • Drama",
  bgImage: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=2070&auto=format&fit=crop", 
  logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/The_Americans_logo.svg/1200px-The_Americans_logo.svg.png",
  videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
};

const MOCK_FILMES = [
  { id: 1, title: "Pânico 7", img: "https://images.unsplash.com/photo-1549845344-0aee50a1a1db?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { id: 2, title: "Quarteto Fantástico", img: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
  { id: 3, title: "Jurassic World", img: "https://images.unsplash.com/photo-1596515822384-5f532a2490b6?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
  { id: 10, title: "Vingadores", img: "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { id: 11, title: "O Senhor dos Anéis", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { id: 12, title: "Matrix", img: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
];

const MOCK_SERIES = [
  { id: 4, title: "Stranger Things", img: "https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
  { id: 5, title: "Breaking Bad", img: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
  { id: 6, title: "Game of Thrones", img: "https://images.unsplash.com/photo-1580579979312-dceec988a82d?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
  { id: 13, title: "The Boys", img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
];

const MOCK_ANIMES = [
  { id: 7, title: "Attack on Titan", img: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
  { id: 8, title: "Demon Slayer", img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4" },
  { id: 9, title: "Naruto", img: "https://images.unsplash.com/photo-1622325368383-7c9f80aaff25?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4" },
  { id: 14, title: "Jujutsu Kaisen", img: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
  { id: 15, title: "One Piece", img: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?q=80&w=400&fit=crop", video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
];

export function CinemaModal({ onClose, initialQuery, onAskAI }: CinemaModalProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState(initialQuery || "");
  const [visibleVideo, setVisibleVideo] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const playerRef = useRef<any>(null);

  // Escutar eventos customizados caso a IA decida abrir um player via window API.
  useEffect(() => {
    const handleOpenVideoEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.url) {
        handlePlayVideo(customEvent.detail.url);
      }
    };
    window.addEventListener('openCinemaPlayer', handleOpenVideoEvent);
    return () => window.removeEventListener('openCinemaPlayer', handleOpenVideoEvent);
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.match(/^(https?:\/\/)/)) {
      handlePlayVideo(initialQuery);
    }
  }, [initialQuery]);

  const handlePlayVideo = (url: string) => {
    setVisibleVideo(url);
  };

  const handleCloseVideo = () => {
    setVisibleVideo(null);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchQuery.match(/^(https?:\/\/)/)) {
      handlePlayVideo(searchQuery);
    } else {
      setIsSearching(true);
      if (onAskAI) {
         // Fechar o player para ver o chat caso a interface precise voltar, mas vamos manter
         // ou notificar a IA que queremos um link.
         onAskAI(`[Módulo Cinema Ativado] O usuário quer assistir: "${searchQuery}". Você DEVE OBRIGATORIAMENTE buscar na internet e encontrar um link direto válido e reproduzível (que termine em .m3u8, .mp4) e então INVOCAR a tool 'playCinemaVideo' com a URL. Diga apenas que está preparando o vídeo.`); // Opcional: onClose(); 
      }
      setTimeout(() => setIsSearching(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B0B0C] z-50 flex flex-col font-sans overflow-hidden text-white">
      
      {/* Player Overlay */}
      <AnimatePresence>
        {visibleVideo && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="absolute top-4 right-4 z-[110] flex gap-2">
              <button
                onClick={() => alert("Copie a URL da sala e envie para seus amigos! (Funcionalidade em desenvolvimento na v2)")}
                className="flex items-center gap-2 px-4 py-3 bg-[#6C5CE7] hover:bg-[#5b4bc4] rounded-full transition-colors backdrop-blur-md font-semibold font-sans shadow-lg text-white"
              >
                <Users size={20} />
                <span className="hidden sm:inline">Assistir com Amigos</span>
              </button>
              <button
                onClick={handleCloseVideo}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors"
                title="Fechar Player"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 w-full h-full relative z-[105] bg-black">
               {/* @ts-ignore */}
               <ReactPlayer
                 ref={playerRef}
                 url={visibleVideo}
                 width="100%"
                 height="100%"
                 playing={true}
                 controls={true}
                 style={{ backgroundColor: 'black' }}
                 config={{
                   file: { 
                     attributes: { crossOrigin: "anonymous" },
                     forceVideo: true,
                     forceHLS: visibleVideo?.includes("m3u8")
                   }
                 } as any}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close App Button */}
      <div className="absolute top-4 right-4 z-[60]">
        {!visibleVideo && (
          <button
            onClick={onClose}
            className="p-3 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors backdrop-blur-sm"
          >
            <X size={24} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-24 relative custom-scrollbar">
        {activeTab === 'home' && (
          <>
            {/* Hero Section */}
            <div className="relative w-full h-[65vh] pt-10 flex flex-col justify-end pb-8">
              <div 
                className="absolute inset-0 bg-cover bg-center brightness-75"
                style={{ backgroundImage: `url(${MOCK_HERO.bgImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0C]/60 to-transparent" />
              
              <div className="relative z-10 px-6 flex flex-col items-center">
                <div className="text-4xl md:text-5xl font-black mb-2 tracking-tighter uppercase font-serif drop-shadow-xl text-center">
                  THE AMERICANS
                </div>
                <p className="text-sm md:text-base font-semibold text-gray-200 drop-shadow-md mb-6">
                  {MOCK_HERO.category}
                </p>

                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
                  <button className="flex flex-col items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Plus size={24} />
                    <span className="text-[10px] md:text-xs">Lista</span>
                  </button>

                  <button 
                    onClick={() => handlePlayVideo(MOCK_HERO.videoUrl)}
                    className="flex items-center justify-center gap-2 bg-white text-black px-6 md:px-8 py-3 rounded-md hover:bg-gray-200 transition-colors shadow-lg active:scale-95 transform"
                  >
                    <Play size={24} fill="currentColor" />
                    <span className="font-bold text-base md:text-lg">Reproduzir</span>
                  </button>

                  {/* Assistir com Amigos Button */}
                  <button 
                    onClick={() => {
                        // Poderia integrar com a sala multiplayer do Dev AI.
                        alert("Modo Multiplayer 'Assistir com Amigos' ativado! Convide pessoas para a sala.");
                        handlePlayVideo(MOCK_HERO.videoUrl);
                    }}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors shadow-lg active:scale-95 transform font-bold text-sm md:text-base"
                  >
                    <Users size={20} fill="currentColor" />
                    Assistir c/ Amigos
                  </button>

                  <button className="flex flex-col items-center gap-2 text-gray-300 hover:text-white transition-colors">
                    <Info size={24} />
                    <span className="text-[10px] md:text-xs">Info</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Rows */}
            <div className="px-4 mt-6 space-y-8">
              <MovieRow title="Filmes Recomendados" movies={MOCK_FILMES} onPlay={(url) => handlePlayVideo(url)} />
              <MovieRow title="Séries em Alta" movies={MOCK_SERIES} onPlay={(url) => handlePlayVideo(url)} />
              <MovieRow title="Animes Populares" movies={MOCK_ANIMES} onPlay={(url) => handlePlayVideo(url)} />
              <MovieRow title="Continuar Assistindo" movies={MOCK_FILMES} isContinue onPlay={(url) => handlePlayVideo(url)} />
            </div>
          </>
        )}

        {activeTab === 'search' && (
          <div className="pt-24 px-6">
             <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 mb-4 tracking-tighter">Buscador Universal 🍿</h1>
              <p className="text-gray-400 text-sm max-w-md mx-auto">Digite a URL do vídeo ou o nome para nossa IA buscar e reproduzir.</p>
            </div>
            <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl mx-auto">
              <div className="relative flex flex-col gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Filme Matrix, ou cole URL (M3U8/MP4)..."
                  className="w-full bg-[#1A1A1A] border border-gray-800 text-white px-6 py-5 rounded-2xl pr-16 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-2xl text-lg"
                  autoFocus
                />
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="flex-1 p-4 bg-red-600 font-bold text-white rounded-xl hover:bg-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSearching ? "Buscando com IA..." : (
                      <>
                        <Search size={20} /> Localizar e Reproduzir
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#0B0B0C]/95 backdrop-blur-md border-t border-gray-800/60 flex items-center justify-around px-2 z-[50]">
        <NavButton title="Ínicio" icon={<Home size={22} />} isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavButton title="Pesquisa" icon={<Search size={22} />} isActive={activeTab === 'search'} onClick={() => setActiveTab('search')} />
        <NavButton title="Pasta" icon={<Folder size={22} />} isActive={activeTab === 'folder'} onClick={() => setActiveTab('folder')} />
        <NavButton title="Downloads" icon={<Download size={22} />} isActive={activeTab === 'download'} onClick={() => setActiveTab('download')} />
        <NavButton title="Ajustes" icon={<Settings size={22} />} isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>

    </div>
  );
}

function NavButton({ icon, isActive, onClick, title }: { icon: React.ReactNode, isActive: boolean, onClick: () => void, title: string }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 flex flex-col items-center justify-center min-w-[64px] rounded-2xl transition-all ${isActive ? 'text-amber-500' : 'text-gray-500 hover:text-gray-300'}`}
    >
      {React.cloneElement(icon as React.ReactElement, {
         fill: isActive ? "currentColor" : "none",
         strokeWidth: isActive ? 2 : 1.5
      } as any)}
      <span className="text-[10px] mt-1 font-medium">{title}</span>
    </button>
  );
}

function MovieRow({ title, movies, isContinue, onPlay }: { title: string, movies: any[], isContinue?: boolean, onPlay: (videoUrl: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <ChevronRight size={20} className="text-gray-400" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
        {movies.map((movie) => (
          <div key={movie.id} onClick={() => onPlay(movie.video)} className={`relative shrink-0 snap-start cursor-pointer group ${isContinue ? 'w-[240px] aspect-video' : 'w-[130px] md:w-[150px] aspect-[2/3]'}`}>
            <img 
              src={movie.img} 
              alt={movie.title}
              className="w-full h-full object-cover rounded-md shadow-lg group-hover:ring-2 ring-white/50 transition-all"
            />
            {isContinue && (
              <>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/50">
                    <Play size={20} fill="white" className="ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600 rounded-b-md overflow-hidden">
                   <div className="h-full bg-red-600 w-1/2" />
                </div>
              </>
            )}
            {!isContinue && (
              <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={24} fill="white" className="mb-2 mx-auto drop-shadow-md" />
                  <p className="text-xs text-center text-white font-semibold shadow-black drop-shadow-md line-clamp-1">{movie.title}</p>
              </div>
            )}
            {!isContinue && (
              <p className="mt-2 text-xs md:text-sm text-center text-gray-300 line-clamp-1 font-medium">{movie.title}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
