
import React, { useState, useEffect, useRef } from 'react';
import { MONTHS, EVENT_TYPES, MONTH_THEMES } from './constants';
import { EventType, EventData } from './types';
import { generateEventIdeas, suggestLocation } from './services/geminiService';
import BubbleStack from './components/BubbleStack';
import RegistrationModal from './components/RegistrationModal';

// Gun est chargé via index.html
declare var Gun: any;

const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [inputName, setInputName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [gunNode, setGunNode] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialisation de Gun avec des relais publics
    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_prod_v4_final_stable'); 
    setGunNode(node);

    // Écoute du logo dans la base de données
    node.get('settings').get('logo').on((data: string) => {
      if (data) setSiteLogo(data);
    });

    // Écoute des événements
    node.map().on((data: any, id: string) => {
      if (id === 'settings') return;
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !gunNode) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const optimizedBase64 = canvas.toDataURL('image/webp', 0.85);
        setSiteLogo(optimizedBase64);
        gunNode.get('settings').get('logo').put(optimizedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddEvent = async () => {
    if (!selectedMonth || !selectedType || !gunNode) return;
    setLoading(true);
    try {
      const idea = await generateEventIdeas(selectedMonth, selectedType, inputName);
      const location = await suggestLocation(idea.title, selectedMonth);
      const id = Math.random().toString(36).substr(2, 9);
      
      gunNode.get(id).put({
        ...idea,
        maxParticipants: 4,
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
      alert("Oups ! Erreur lors de la création de l'événement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-4 md:pt-12 pb-24 flex flex-col items-center max-w-[1700px] mx-auto overflow-x-hidden">
      <header className="w-full text-center mb-10 md:mb-12 flex flex-col items-center">
        
        {/* Zone du Logo Interactive - Taille réduite de 20% */}
        <div 
          className="relative mb-6 group cursor-pointer transition-all duration-500"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="max-w-[240px] md:max-w-[304px] relative">
            {siteLogo ? (
              <div className="relative">
                {/* Effet de lueur derrière le logo */}
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-110 opacity-50"></div>
                <img 
                  src={siteLogo} 
                  alt="Day Logo" 
                  className="w-full h-auto drop-shadow-2xl relative z-10 transition-transform group-hover:scale-[1.03]"
                />
              </div>
            ) : (
              <div className="w-56 h-28 border-4 border-dashed border-emerald-200/40 rounded-[2rem] flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm hover:bg-white/50 hover:border-emerald-300 transition-all">
                 <div className="text-emerald-500 font-black text-3xl mb-0.5 tracking-tighter">Day<span className="text-emerald-300">🪡</span></div>
                 <div className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-[0.2em]">Cliquer pour ajouter votre logo</div>
              </div>
            )}
            
            {/* Badge d'édition au survol */}
            <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleLogoUpload} 
          />
        </div>
        
        <p className="text-slate-400 mt-2 mb-8 font-bold tracking-[0.3em] uppercase text-[10px] opacity-70">L'organisation cousue main</p>

        <div className="max-w-5xl w-full mx-auto relative group">
          <div className="absolute -inset-1.5 bg-emerald-400/20 blur-xl rounded-[2.8rem] opacity-0 group-hover:opacity-100 transition-all duration-1000 ease-out pointer-events-none"></div>
          <div className="absolute inset-0 bg-emerald-500/5 blur-md rounded-[2.5rem] pointer-events-none"></div>
          
          <div className="glass p-2 md:p-3 rounded-[2.5rem] shadow-[0_10px_40px_rgba(16,185,129,0.12)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 transition-all duration-700 ease-out flex flex-col md:flex-row gap-0 items-stretch border border-white/40 relative z-10">
            <div className="flex-[2] flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 rounded-l-[2rem] transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">NOM EVENEMENT</label>
              <input 
                type="text" 
                value={inputName} 
                onChange={(e) => setInputName(e.target.value)} 
                placeholder="Ex: Soirée jeux..." 
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

      <main className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 md:gap-8 snap-y snap-mandatory">
        {MONTHS.map((month) => {
          const isSelected = selectedMonth === month;
          return (
            <section 
              key={month} 
              className={`group relative flex flex-col min-h-[480px] md:min-h-[320px] p-6 md:p-6 rounded-[2.5rem] border transition-all duration-700 snap-start snap-always ${MONTH_THEMES[month].bg} ${isSelected ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_25px_60px_rgba(16,185,129,0.2)] bg-white/80' : MONTH_THEMES[month].border} hover:shadow-xl`}
            >
              <h2 className={`text-2xl md:text-2xl font-black tracking-tight flex items-center gap-3 mb-6 md:mb-8 transition-colors duration-500 ${isSelected ? 'text-emerald-900' : MONTH_THEMES[month].text}`}>
                <span className={`rounded-full transition-all duration-500 ${isSelected ? 'w-3 h-10 md:h-10 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' : `w-2 h-8 md:h-8 ${MONTH_THEMES[month].accent}`}`}></span>
                {month}
              </h2>
              <div className="flex-1 flex flex-wrap content-center justify-center gap-4 md:gap-6 relative z-10">
                <BubbleStack 
                  events={events.filter(e => e.month === month)}
                  canEdit={true}
                  onEventClick={(event) => setActiveEvent(event)}
                  onEventDelete={(id) => gunNode.get(id).put(null)}
                />
              </div>
            </section>
          );
        })}
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
