
import React, { useState, useEffect, useRef } from 'react';
import { MONTHS, EVENT_TYPES, MONTH_THEMES } from './constants';
import { EventType, EventData } from './types';
import { generateEventIdeas, suggestLocation } from './services/geminiService';
import EventBubble from './components/EventBubble';
import RegistrationModal from './components/RegistrationModal';

// Gun est chargé via index.html
declare var Gun: any;

const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [inputName, setInputName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [gunNode, setGunNode] = useState<any>(null);

  // Références pour le défilement vers les mois
  const monthRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_prod_v2_stable'); 
    setGunNode(node);

    node.map().on((data: any, id: string) => {
      setEvents(current => {
        if (!data) return current.filter(e => e.id !== id);
        try {
          const attendees = typeof data.attendees === 'string' ? JSON.parse(data.attendees) : (data.attendees || []);
          const location = typeof data.location === 'string' ? JSON.parse(data.location) : (data.location || { name: "Lieu à définir" });
          
          const formattedEvent: EventData = {
            ...data,
            id,
            attendees,
            location,
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

  // Déclenche le défilement quand le mois change via le select
  useEffect(() => {
    if (selectedMonth && monthRefs.current[selectedMonth]) {
      monthRefs.current[selectedMonth]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedMonth]);

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
    } catch (err: any) {
      console.error("Erreur de création:", err);
      if (err.message === "API_KEY_MISSING") {
        alert("La clé API Gemini (API_KEY) n'est pas configurée dans les variables d'environnement.");
      } else {
        alert("Oups ! Erreur lors de la création de l'événement.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20 flex flex-col items-center max-w-[1700px] mx-auto overflow-x-hidden">
      <div className="fixed top-6 right-6 z-[60]">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 sync-indicator"></div>
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      <header className="w-full text-center mb-16 flex flex-col items-center">
        <div className="relative mb-6">
          <h1 className="text-8xl font-black tracking-tighter flex items-center justify-center relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 relative flex items-center gap-6">
              Day
              <div className="w-20 h-20 animate-float flex items-center justify-center">
                <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25,100 L75,100 C75,100 82,30 50,20 C18,30 25,100 25,100 Z" fill="url(#thimbleGrad)" />
                  <path d="M25,100 L75,100 C75,100 82,30 50,20 C18,30 25,100 25,100 Z" fill="url(#thimbleOverlay)" />
                  <g fill="white" fillOpacity="0.15">
                    {[35, 50, 65].map(x => [40, 55, 70, 85].map(y => (
                      <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" />
                    )))}
                  </g>
                  <path d="M18,98 Q18,112 50,112 Q82,112 82,98" stroke="url(#thimbleGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />
                  <defs>
                    <linearGradient id="thimbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                    <linearGradient id="thimbleOverlay" x1="50%" y1="0%" x2="50%" y2="100%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="black" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </span>
          </h1>
        </div>
        
        <p className="text-slate-400 mt-6 mb-12 font-bold tracking-[0.2em] uppercase text-[10px]">L'organisation cousue main</p>

        <div className="max-w-5xl w-full mx-auto">
          <div className="glass p-2 md:p-3 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row gap-0 items-stretch border border-white/40">
            <div className="flex-[2] flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 rounded-l-[2rem] transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Sujet (Optionnel)</label>
              <input 
                type="text" 
                value={inputName} 
                onChange={(e) => setInputName(e.target.value)} 
                placeholder="Ex: Soirée jeux, Pique-nique..." 
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
          <section 
            key={month} 
            ref={el => monthRefs.current[month] = el}
            className={`group relative flex flex-col min-h-[400px] p-8 rounded-[3.5rem] border transition-all duration-700 ${MONTH_THEMES[month].bg} ${selectedMonth === month ? 'border-emerald-400 ring-4 ring-emerald-500/10 shadow-2xl scale-[1.02]' : MONTH_THEMES[month].border} hover:shadow-xl`}
          >
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
            const current = Array.isArray(activeEvent.attendees) ? activeEvent.attendees : [];
            const updated = [...current, name];
            gunNode.get(activeEvent.id).put({ attendees: JSON.stringify(updated) });
            setActiveEvent({ ...activeEvent, attendees: updated });
          }} 
          onUnregister={(index) => {
            const current = Array.isArray(activeEvent.attendees) ? activeEvent.attendees : [];
            const updated = [...current];
            updated.splice(index, 1);
            gunNode.get(activeEvent.id).put({ attendees: JSON.stringify(updated) });
            setActiveEvent({ ...activeEvent, attendees: updated });
          }}
          onUpdateLocation={(loc) => { 
            const updated = { name: loc, mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}` }; 
            gunNode.get(activeEvent.id).put({ location: JSON.stringify(updated) }); 
            setActiveEvent({...activeEvent, location: updated}); 
          }}
          onUpdateDate={(val) => { gunNode.get(activeEvent.id).put({ date: val }); setActiveEvent({...activeEvent, date: val}); }}
          onUpdateDescription={(val) => { gunNode.get(activeEvent.id).put({ description: val }); setActiveEvent({...activeEvent, description: val}); }}
          onUpdateMaxParticipants={(val) => { gunNode.get(activeEvent.id).put({ maxParticipants: val }); setActiveEvent({...activeEvent, maxParticipants: val}); }}
        />
      )}
    </div>
  );
};

export default App;
