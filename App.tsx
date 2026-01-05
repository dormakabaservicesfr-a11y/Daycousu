
import React, { useState, useEffect, useCallback } from 'react';
import { MONTHS, EVENT_TYPES, MONTH_THEMES } from './constants.tsx';
import { EventType, EventData } from './types.ts';
import { generateEventIdeas, suggestLocation } from './services/geminiService.ts';
import EventBubble from './components/EventBubble.tsx';
import RegistrationModal from './components/RegistrationModal.tsx';

declare var Gun: any;

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [inputName, setInputName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [gunNode, setGunNode] = useState<any>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<{message: string, isKeyError: boolean} | null>(null);

  // Recherche ultra-robuste de l'objet aistudio dans la hiérarchie des frames
  const getAIStudio = useCallback((): AIStudio | null => {
    try {
      if (window.aistudio) return window.aistudio;
      if (typeof window.parent !== 'undefined' && (window.parent as any).aistudio) return (window.parent as any).aistudio;
      if (typeof window.top !== 'undefined' && (window.top as any).aistudio) return (window.top as any).aistudio;
    } catch (e) {
      console.warn("Accès aux frames parentes restreint par la politique CORS.");
    }
    return null;
  }, []);

  useEffect(() => {
    // Initialisation de Gun.js avec un canal unique pour éviter les collisions
    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_shared_v11_stable'); 
    setGunNode(node);

    const checkKey = async () => {
      const studio = getAIStudio();
      if (studio) {
        try {
          const has = await studio.hasSelectedApiKey();
          setHasApiKey(has);
        } catch (e) {
          // Si on a déjà une clé en env, on considère que c'est bon
          setHasApiKey(!!process.env.API_KEY);
        }
      } else {
        setHasApiKey(!!process.env.API_KEY);
      }
    };
    checkKey();

    node.map().on((data: any, id: string) => {
      setEvents(current => {
        if (!data) return current.filter(e => e.id !== id);
        try {
          const formattedEvent: EventData = {
            ...data,
            id,
            attendees: typeof data.attendees === 'string' ? JSON.parse(data.attendees) : (data.attendees || []),
            location: typeof data.location === 'string' ? JSON.parse(data.location) : (data.location || { name: "Lieu à définir" }),
            isAiGenerated: data.isAiGenerated === 'true' || data.isAiGenerated === true
          };
          const exists = current.find(e => e.id === id);
          if (exists && JSON.stringify(exists) === JSON.stringify(formattedEvent)) return current;
          return exists ? current.map(e => e.id === id ? formattedEvent : e) : [...current, formattedEvent];
        } catch (e) { return current; }
      });
    });
    return () => node.off();
  }, [getAIStudio]);

  const handleOpenKeySelector = async () => {
    const studio = getAIStudio();
    if (studio) {
      try {
        await studio.openSelectKey();
        setHasApiKey(true);
        setErrorInfo(null);
      } catch (e) {
        setErrorInfo({ message: "Le sélecteur n'a pas pu s'ouvrir. Essayez de recharger la page.", isKeyError: true });
      }
    } else {
      setErrorInfo({ 
        message: "L'outil de sélection de clé n'est pas accessible dans ce navigateur. Vérifiez que vous n'êtes pas en navigation privée.", 
        isKeyError: true 
      });
    }
  };

  const handleAddEvent = async () => {
    if (!selectedMonth || !selectedType || !gunNode) return;
    setLoading(true);
    setErrorInfo(null);
    
    try {
      const idea = await generateEventIdeas(selectedMonth, selectedType, inputName);
      const location = await suggestLocation(idea.title, selectedMonth);
      const id = Math.random().toString(36).substr(2, 9);
      
      gunNode.get(id).put({
        ...idea,
        type: selectedType,
        month: selectedMonth,
        attendees: JSON.stringify([]),
        location: JSON.stringify(location),
        isAiGenerated: 'true'
      });
      setInputName('');
      setSelectedType('');
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("KEY_NOT_FOUND") || msg.includes("401") || msg.includes("not found")) {
        setHasApiKey(false);
        setErrorInfo({ message: "Une clé API est requise pour l'IA. Veuillez en sélectionner une.", isKeyError: true });
      } else {
        setErrorInfo({ message: "Note : " + msg, isKeyError: false });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20 flex flex-col items-center max-w-[1700px] mx-auto overflow-x-hidden">
      <div className="fixed top-6 right-6 z-[60] flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 sync-indicator"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Sync</span>
        </div>
        {!hasApiKey && (
          <button 
            onClick={handleOpenKeySelector} 
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full shadow-xl font-black text-[11px] uppercase animate-pulse border-2 border-white/50"
          >
            Activer l'IA ✨
          </button>
        )}
      </div>

      <header className="w-full text-center mb-16 flex flex-col items-center">
        {/* Logo Stylisé : Fil part du pied du Y avec une aiguille au bout */}
        <div className="relative mb-8">
          <h1 className="text-8xl font-black tracking-tighter flex items-center justify-center relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 relative">
              Day
              <svg className="absolute top-[88%] left-[84%] w-[200px] h-[80px] pointer-events-none overflow-visible" viewBox="0 0 200 80" fill="none">
                 {/* Le Fil */}
                 <path 
                   className="thread-path"
                   d="M0,0 C20,50 100,60 150,20" 
                   stroke="url(#gradLogo)" 
                   strokeWidth="3.5" 
                   strokeLinecap="round" 
                   fill="none" 
                 />
                 {/* L'Aiguille à l'extrémité du fil */}
                 <g transform="translate(150, 20) rotate(-25)">
                    {/* Corps de l'aiguille */}
                    <path 
                      d="M-5,0 L45,0 L55,2.5 L45,5 L-5,5 C-8,5 -12,2.5 -12,2.5 C-12,2.5 -8,0 -5,0 Z" 
                      fill="url(#gradLogo)"
                      className="animate-float"
                    />
                    {/* Chas de l'aiguille (le trou) */}
                    <circle cx="-6" cy="2.5" r="1.5" fill="white" fillOpacity="0.9" />
                 </g>
                 <defs>
                   <linearGradient id="gradLogo" x1="0" y1="0" x2="1" y2="0.5">
                     <stop stopColor="#10b981" />
                     <stop offset="1" stopColor="#14b8a6" />
                   </linearGradient>
                 </defs>
              </svg>
            </span>
          </h1>
        </div>
        
        <p className="text-slate-400 mt-8 mb-12 font-bold tracking-[0.2em] uppercase text-[10px]">L'organisation cousue main</p>

        {errorInfo && (
          <div className={`max-w-2xl w-full mb-10 p-6 rounded-[2.5rem] border text-left shadow-2xl animate-in fade-in slide-in-from-top-4 ${errorInfo.isKeyError ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{errorInfo.isKeyError ? '🔑' : '💡'}</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Note système</p>
            </div>
            <p className="text-sm font-bold text-slate-700 ml-8">{errorInfo.message}</p>
            {errorInfo.isKeyError && (
              <div className="mt-4 ml-8 flex flex-wrap gap-3">
                <button 
                  onClick={handleOpenKeySelector} 
                  className="px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  Saisir une clé
                </button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-slate-50 transition-all"
                >
                  Aide facturation
                </a>
              </div>
            )}
          </div>
        )}

        <div className="max-w-5xl w-full mx-auto">
          <div className="glass p-2 md:p-3 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row gap-0 items-stretch border border-white/40">
            <div className="flex-[2] flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 rounded-l-[2rem] transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Événement</label>
              <input 
                type="text" 
                value={inputName} 
                onChange={(e) => setInputName(e.target.value)} 
                placeholder="Titre libre (ex: Brunch)" 
                className="bg-transparent w-full outline-none font-bold text-slate-700 text-sm placeholder:text-slate-300" 
              />
            </div>
            <div className="h-10 w-[1px] bg-slate-200/50 self-center hidden md:block"></div>
            <div className="flex-1 flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Mois</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="bg-transparent w-full outline-none font-bold text-slate-600 text-sm appearance-none cursor-pointer"
              >
                <option value="" disabled>Choisir</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="h-10 w-[1px] bg-slate-200/50 self-center hidden md:block"></div>
            <div className="flex-1 flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Type</label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value as EventType)} 
                className="bg-transparent w-full outline-none font-bold text-slate-600 text-sm appearance-none cursor-pointer"
              >
                <option value="" disabled>Choisir</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button 
              onClick={handleAddEvent} 
              disabled={loading || !selectedMonth || !selectedType} 
              className={`m-1 px-10 py-4 rounded-[2rem] font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${loading || !selectedMonth || !selectedType ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-emerald-200/50 hover:-translate-y-0.5'}`}
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="tracking-[0.2em] text-[11px]">CRÉER</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {MONTHS.map((month) => (
          <section key={month} className={`group relative flex flex-col min-h-[400px] p-8 rounded-[3.5rem] border transition-all ${MONTH_THEMES[month].bg} ${MONTH_THEMES[month].border} hover:shadow-xl`}>
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 mb-8 ${MONTH_THEMES[month].text}`}>
              <span className={`w-2 h-8 rounded-full ${MONTH_THEMES[month].accent}`}></span>
              {month}
            </h2>
            <div className="flex-1 flex flex-wrap content-start justify-center gap-6 relative z-10">
              {events.filter(e => e.month === month).map(event => (
                <EventBubble 
                  key={event.id} 
                  event={event} 
                  canEdit={true} 
                  onClick={() => setActiveEvent(event)} 
                  onDelete={() => gunNode.get(event.id).put(null)} 
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {activeEvent && (
        <RegistrationModal 
          event={activeEvent} 
          canEdit={true} 
          onClose={() => setActiveEvent(null)} 
          onRegister={(name) => {
            const updated = [...(activeEvent.attendees || []), name];
            gunNode.get(activeEvent.id).get('attendees').put(JSON.stringify(updated));
            setActiveEvent({ ...activeEvent, attendees: updated });
          }} 
          onUnregister={(index) => {
            const updated = [...(activeEvent.attendees || [])];
            updated.splice(index, 1);
            gunNode.get(activeEvent.id).get('attendees').put(JSON.stringify(updated));
            setActiveEvent({ ...activeEvent, attendees: updated });
          }}
          onUpdateLocation={(loc) => { 
            const updated = { name: loc, mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}` }; 
            gunNode.get(activeEvent.id).get('location').put(JSON.stringify(updated)); 
            setActiveEvent({...activeEvent, location: updated}); 
          }}
          onUpdateDate={(val) => { gunNode.get(activeEvent.id).get('date').put(val); setActiveEvent({...activeEvent, date: val}); }}
          onUpdateDescription={(val) => { gunNode.get(activeEvent.id).get('description').put(val); setActiveEvent({...activeEvent, description: val}); }}
          onUpdateMaxParticipants={(val) => { gunNode.get(activeEvent.id).get('maxParticipants').put(val); setActiveEvent({...activeEvent, maxParticipants: val}); }}
        />
      )}
    </div>
  );
};

export default App;
