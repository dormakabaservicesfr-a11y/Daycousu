
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

  // Détection robuste du studio AI (recherche récursive simple)
  const getAIStudio = useCallback(() => {
    try {
      if (window.aistudio) return window.aistudio;
      if (window.parent && (window.parent as any).aistudio) return (window.parent as any).aistudio;
      if (window.top && (window.top as any).aistudio) return (window.top as any).aistudio;
      return null;
    } catch (e) {
      return null;
    }
  }, []);

  useEffect(() => {
    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_shared_v10_final'); 
    setGunNode(node);

    const checkKey = async () => {
      const studio = getAIStudio();
      if (studio) {
        try {
          const has = await studio.hasSelectedApiKey();
          setHasApiKey(has);
        } catch (e) {
          console.warn("Vérification clé API impossible");
        }
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
        // Règle Gemini : Assumer le succès immédiatement après l'appel
        setHasApiKey(true);
        setErrorInfo(null);
      } catch (e) {
        setErrorInfo({ message: "Échec de l'ouverture du sélecteur de clé.", isKeyError: true });
      }
    } else {
      setErrorInfo({ 
        message: "Sélecteur de clé introuvable. Veuillez rafraîchir la page ou vérifier vos paramètres de sécurité.", 
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
      if (msg.includes("KEY_NOT_FOUND") || msg.includes("invalid") || msg.includes("entity was not found")) {
        setHasApiKey(false);
        setErrorInfo({ message: "Une clé API valide est nécessaire. Veuillez cliquer sur 'Saisir une clé'.", isKeyError: true });
      } else {
        setErrorInfo({ message: "Erreur IA : " + msg, isKeyError: false });
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
        {/* Logo unifié : Fil et Aiguille partant du Y */}
        <div className="relative mb-6">
          <h1 className="text-8xl font-black tracking-tighter flex items-center justify-center relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 relative">
              Day
              {/* Le fil et l'aiguille intégrés */}
              <svg className="absolute top-[82%] left-[82%] w-[160px] h-[70px] pointer-events-none overflow-visible" viewBox="0 0 160 70" fill="none">
                 <path 
                   className="thread-path"
                   d="M0,0 C20,40 70,50 110,15" 
                   stroke="url(#threadGradLogo)" 
                   strokeWidth="3" 
                   strokeLinecap="round" 
                   fill="none" 
                 />
                 {/* L'aiguille au bout du fil */}
                 <g transform="translate(110, 15) rotate(-30)">
                    <path 
                      d="M-2,0 L35,0 L42,2 L35,4 L-2,4 C-4,4 -7,2 -7,2 C-7,2 -4,0 -2,0 Z" 
                      fill="url(#threadGradLogo)"
                      className="animate-float"
                    />
                    {/* Le chas de l'aiguille */}
                    <circle cx="-2.5" cy="2" r="1.2" fill="white" fillOpacity="0.8" />
                 </g>
                 <defs>
                   <linearGradient id="threadGradLogo" x1="0" y1="0" x2="1" y2="0.5">
                     <stop stopColor="#10b981" />
                     <stop offset="1" stopColor="#14b8a6" />
                   </linearGradient>
                 </defs>
              </svg>
            </span>
          </h1>
        </div>
        
        <p className="text-slate-400 mt-6 mb-12 font-bold tracking-[0.2em] uppercase text-[10px]">L'organisation cousue main</p>

        {errorInfo && (
          <div className={`max-w-2xl w-full mb-10 p-6 rounded-[2.5rem] border text-left shadow-2xl animate-in fade-in slide-in-from-top-4 ${errorInfo.isKeyError ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{errorInfo.isKeyError ? '🔑' : '⚠️'}</span>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Configuration Requise</p>
            </div>
            <p className="text-sm font-bold text-slate-700 ml-8">{errorInfo.message}</p>
            {errorInfo.isKeyError && (
              <button 
                onClick={handleOpenKeySelector} 
                className="mt-4 ml-8 px-8 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg border border-white/20"
              >
                Saisir une clé maintenant
              </button>
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
                placeholder="Titre libre (ex: Soirée Jeux)" 
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
