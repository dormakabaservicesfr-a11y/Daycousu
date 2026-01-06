
import React, { useState, useEffect } from 'react';
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

const MonthSection: React.FC<{
  month: string;
  events: EventData[];
  onEventClick: (e: EventData) => void;
  onDelete: (id: string) => void;
}> = ({ month, events, onEventClick, onDelete }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (events.length > 0) {
      const now = new Date();
      const currentYear = now.getFullYear();
      let bestIndex = 0;
      let minDiff = Infinity;

      events.forEach((event, idx) => {
        try {
          const dayMatch = event.date.match(/\d+/);
          const day = dayMatch ? parseInt(dayMatch[0]) : 1;
          const monthIdx = MONTHS.indexOf(event.month);
          const eventDate = new Date(currentYear, monthIdx, day);
          const diff = Math.abs(now.getTime() - eventDate.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            bestIndex = idx;
          }
        } catch (e) {}
      });
      setActiveIndex(bestIndex);
    }
  }, [events.length, month]);

  const nextEvent = () => setActiveIndex((prev) => (prev + 1) % events.length);
  const prevEvent = () => setActiveIndex((prev) => (prev - 1 + events.length) % events.length);

  const theme = MONTH_THEMES[month];

  return (
    <section className={`group relative flex flex-col min-h-[420px] p-8 rounded-[3.5rem] border transition-all ${theme.bg} ${theme.border} hover:shadow-xl overflow-hidden`}>
      <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 mb-8 ${theme.text} relative z-40`}>
        <span className={`w-2 h-8 rounded-full ${theme.accent}`}></span>
        {month}
      </h2>

      <div className="flex-1 relative flex items-center justify-center">
        {events.length > 0 ? (
          <>
            <div className="relative w-40 h-40">
              {events.map((event, idx) => {
                const isActive = idx === activeIndex;
                const isPrev = idx === (activeIndex - 1 + events.length) % events.length && events.length > 1;
                const isNext = idx === (activeIndex + 1) % events.length && events.length > 1;

                let style = "z-0 opacity-0 scale-75 translate-x-0";
                if (isActive) {
                  style = "z-30 opacity-100 scale-100 translate-x-0 pointer-events-auto";
                } else if (isPrev) {
                  style = "z-20 opacity-30 scale-90 -translate-x-12 -rotate-6 pointer-events-none";
                } else if (isNext) {
                  style = "z-10 opacity-30 scale-90 translate-x-12 rotate-6 pointer-events-none";
                }

                return (
                  <div key={event.id} className={`absolute inset-0 transition-all duration-500 ease-out transform ${style}`}>
                    <EventBubble 
                      event={event} 
                      canEdit={true} 
                      isActive={isActive}
                      onClick={() => onEventClick(event)} 
                      onDelete={() => onDelete(event.id)} 
                    />
                  </div>
                );
              })}
            </div>

            {events.length > 1 && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 z-50 pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); prevEvent(); }} className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-slate-600 hover:bg-white/60 hover:text-emerald-600 transition-all pointer-events-auto shadow-sm active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextEvent(); }} className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-slate-600 hover:bg-white/60 hover:text-emerald-600 transition-all pointer-events-auto shadow-sm active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
};

const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [inputName, setInputName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [gunNode, setGunNode] = useState<any>(null);
  const [needsKey, setNeedsKey] = useState(false);

  useEffect(() => {
    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_v2_stable_prod'); 
    setGunNode(node);

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
  }, []);

  const handleAddEvent = async () => {
    if (!selectedMonth || !selectedType || !gunNode) return;
    setLoading(true);
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
      setNeedsKey(false);
    } catch (err: any) {
      console.error("Erreur:", err);
      if (err.message === "KEY_NOT_FOUND" || err.message?.includes("API key")) {
        setNeedsKey(true);
      } else {
        alert("Une erreur est survenue. Vérifiez votre connexion.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeySetup = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setNeedsKey(false);
      // On retente pas automatiquement pour éviter les boucles, l'utilisateur recliquera sur Créer.
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20 flex flex-col items-center max-w-[1700px] mx-auto overflow-x-hidden">
      <header className="w-full text-center mb-16 flex flex-col items-center">
        <div className="relative mb-6 flex flex-col items-center select-none cursor-default group overflow-visible">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-black italic relative z-20">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-500 drop-shadow-sm inline-block px-14 pb-8">
              Day
            </span>
          </h1>
        </div>
        
        <p className="text-slate-400 mt-2 mb-12 font-bold tracking-[0.4em] uppercase text-[11px] opacity-70">
          Votre évènement cousu main
        </p>

        <div className="max-w-5xl w-full mx-auto p-12 pt-0">
          <div className="bg-white/30 backdrop-blur-lg p-2 md:p-3 rounded-[2.5rem] flex flex-col md:flex-row gap-0 items-stretch border border-white/40 shadow-[0_0_70px_-5px_rgba(16,185,129,0.15)] hover:shadow-[0_0_90px_-5px_rgba(16,185,129,0.25)] transition-all duration-700 ease-out">
            <div className="flex-[2] flex flex-col justify-center px-6 py-2 group focus-within:bg-white/30 rounded-l-[2rem] transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Événement</label>
              <input 
                type="text" 
                value={inputName} 
                onChange={(e) => setInputName(e.target.value)} 
                placeholder="Ex: Soirée jeux, Brunch..." 
                className="bg-transparent w-full outline-none font-bold text-slate-700 text-sm placeholder:text-slate-400/40" 
              />
            </div>
            <div className="h-10 w-[1px] bg-emerald-200 self-center hidden md:block opacity-30"></div>
            <div className="flex-1 flex flex-col justify-center px-6 py-2 group focus-within:bg-white/30 transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Mois</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent w-full outline-none font-bold text-slate-600 text-sm appearance-none cursor-pointer">
                <option value="" disabled>Choisir</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="h-10 w-[1px] bg-emerald-200 self-center hidden md:block opacity-30"></div>
            <div className="flex-1 flex flex-col justify-center px-6 py-2 group focus-within:bg-white/30 transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Type</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as EventType)} className="bg-transparent w-full outline-none font-bold text-slate-600 text-sm appearance-none cursor-pointer">
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

          {needsKey && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest text-left leading-relaxed">
                  ⚠️ Clé API non détectée sur Vercel.<br/>Connectez votre clé Gemini gratuite pour continuer.
                </p>
                <button 
                  onClick={handleKeySetup}
                  className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shrink-0 shadow-md active:scale-95"
                >
                  Connecter ma clé
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {MONTHS.map((month) => (
          <MonthSection 
            key={month} 
            month={month} 
            events={events.filter(e => e.month === month)}
            onEventClick={(e) => setActiveEvent(e)}
            onDelete={(id) => gunNode.get(id).put(null)}
          />
        ))}
      </main>

      {activeEvent && (
        <RegistrationModal 
          event={activeEvent} 
          canEdit={true} 
          onClose={() => setActiveEvent(null)} 
          onRegister={(name) => {
            const updated = [...(activeEvent.attendees || []), name];
            gunNode.get(activeEvent.id).put({ attendees: JSON.stringify(updated) });
          }} 
          onUnregister={(index) => {
            const updated = [...(activeEvent.attendees || [])];
            updated.splice(index, 1);
            gunNode.get(activeEvent.id).put({ attendees: JSON.stringify(updated) });
          }}
          onUpdateLocation={(loc) => { 
            const updated = { name: loc, mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}` }; 
            gunNode.get(activeEvent.id).put({ location: JSON.stringify(updated) }); 
          }}
          onUpdateDate={(val) => gunNode.get(activeEvent.id).put({ date: val })}
          onUpdateDescription={(val) => gunNode.get(activeEvent.id).put({ description: val })}
          onUpdateMaxParticipants={(val) => gunNode.get(activeEvent.id).put({ maxParticipants: val })}
        />
      )}
    </div>
  );
};

export default App;
