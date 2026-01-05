
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

const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [inputName, setInputName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [gunNode, setGunNode] = useState<any>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [errorInfo, setErrorInfo] = useState<{type: 'KEY' | 'BILLING' | 'QUOTA' | 'OTHER', message: string} | null>(null);

  useEffect(() => {
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(has => setHasApiKey(has));
    }

    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_shared_db_final_v3'); // Version bump for clean start
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

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      setErrorInfo(null);
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
        isAiGenerated: String(idea.isAiGenerated)
      });
      setInputName('');
      setSelectedType('');
    } catch (err: any) {
      const msg = err.message;
      if (msg === "RESET_KEY" || msg === "KEY_NOT_FOUND") {
        setHasApiKey(false);
        setErrorInfo({ type: 'KEY', message: "Clé API invalide ou non sélectionnée." });
      } else if (msg === "BILLING_REQUIRED") {
        setErrorInfo({ type: 'BILLING', message: "La facturation doit être activée sur votre projet Google Cloud pour utiliser Gemini 3 sur ce domaine." });
      } else if (msg === "QUOTA_EXCEEDED") {
        setErrorInfo({ type: 'QUOTA', message: "Limite de requêtes atteinte. Réessayez dans une minute." });
      } else {
        setErrorInfo({ type: 'OTHER', message: `Erreur technique : ${msg}` });
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
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Base Live</span>
        </div>
        {(window.aistudio && !hasApiKey) || errorInfo?.type === 'KEY' ? (
          <button onClick={handleOpenKeySelector} className="px-4 py-2 bg-amber-500 text-white rounded-full shadow-lg font-black text-[10px] uppercase animate-bounce">
            Sélectionner Clé ✨
          </button>
        ) : null}
      </div>

      <header className="w-full text-center mb-16">
        <h1 className="text-7xl font-black mb-4 tracking-tighter flex items-center justify-center gap-3">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">Day</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-teal-600">🧵</span>
        </h1>
        <p className="text-slate-400 mb-12 font-bold tracking-[0.2em] uppercase text-[10px]">L'IA pour vos moments d'exception</p>

        {errorInfo && (
          <div className={`max-w-2xl mx-auto mb-10 p-6 rounded-[2.5rem] border text-left shadow-2xl animate-in fade-in slide-in-from-top-4 ${errorInfo.type === 'BILLING' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
            <h3 className={`font-black text-xs uppercase tracking-widest mb-2 ${errorInfo.type === 'BILLING' ? 'text-amber-800' : 'text-rose-800'}`}>
              ⚠️ {errorInfo.type === 'BILLING' ? 'Facturation Requise' : 'Erreur Critique IA'}
            </h3>
            <p className="text-xs leading-relaxed mb-4 text-slate-600 font-medium">
              {errorInfo.message}
            </p>
            <div className="flex flex-wrap gap-2">
              {errorInfo.type === 'BILLING' && (
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="px-5 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-amber-700 transition-colors">
                  Activer la facturation
                </a>
              )}
              <button onClick={handleOpenKeySelector} className="px-5 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-black transition-colors">
                Changer de clé
              </button>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          <div className="glass p-2 md:p-3 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-0 items-stretch border border-white/40">
            <div className="flex-[2] flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 rounded-l-[2rem] transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Événement</label>
              <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="Dîner, sortie, voyage..." className="bg-transparent w-full outline-none font-bold text-slate-700 text-sm" />
            </div>
            <div className="h-10 w-[1px] bg-slate-200/50 self-center hidden md:block"></div>
            <div className="flex-1 flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Mois</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent w-full outline-none font-bold text-slate-600 text-sm appearance-none cursor-pointer">
                <option value="" disabled>Choisir</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="h-10 w-[1px] bg-slate-200/50 self-center hidden md:block"></div>
            <div className="flex-1 flex flex-col justify-center px-6 py-2 group focus-within:bg-white/40 transition-colors">
              <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 text-left opacity-70">Type</label>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as EventType)} className="bg-transparent w-full outline-none font-bold text-slate-600 text-sm appearance-none cursor-pointer">
                <option value="" disabled>Style</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={handleAddEvent} disabled={loading || !selectedMonth || !selectedType} className={`m-1 px-10 py-4 rounded-[2rem] font-black text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${loading || !selectedMonth || !selectedType ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:shadow-emerald-200/50'}`}>
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <span className="tracking-[0.2em] text-[11px]">CRÉER</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {MONTHS.map((month) => (
          <section key={month} className={`group relative flex flex-col min-h-[400px] p-8 rounded-[3.5rem] border transition-all ${MONTH_THEMES[month].bg} ${MONTH_THEMES[month].border}`}>
            <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 mb-8 ${MONTH_THEMES[month].text}`}>
              <span className={`w-2 h-8 rounded-full ${MONTH_THEMES[month].accent}`}></span>
              {month}
            </h2>
            <div className="flex-1 flex flex-wrap content-start justify-center gap-6 relative z-10">
              {events.filter(e => e.month === month).map(event => (
                <EventBubble key={event.id} event={event} canEdit={true} onClick={() => setActiveEvent(event)} onDelete={() => gunNode.get(event.id).put(null)} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {activeEvent && (
        <RegistrationModal 
          event={activeEvent} canEdit={true} onClose={() => setActiveEvent(null)} 
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
