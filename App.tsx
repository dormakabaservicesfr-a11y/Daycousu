
import React, { useState, useEffect } from 'react';
import { MONTHS, EVENT_TYPES, MONTH_THEMES } from './constants.tsx';
import { EventType, EventData, GeminiEventResponse } from './types.ts';
import { generateEventIdeas, suggestLocation } from './services/geminiService.ts';
import EventBubble from './components/EventBubble.tsx';
import RegistrationModal from './components/RegistrationModal.tsx';

// Gun est chargé globalement via le script dans index.html
declare var Gun: any;

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
                <button onClick={() => setActiveIndex((p) => (p - 1 + events.length) % events.length)} className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-slate-600 hover:bg-white/60 pointer-events-auto shadow-sm active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setActiveIndex((p) => (p + 1) % events.length)} className="w-10 h-10 rounded-full bg-white/40 backdrop-blur-md border border-white/40 flex items-center justify-center text-slate-600 hover:bg-white/60 pointer-events-auto shadow-sm active:scale-90">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-300 text-[10px] font-bold uppercase tracking-widest opacity-40 italic">Aucun événement</div>
        )}
      </div>
    </section>
  );
};

// Main App component
const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [inputName, setInputName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [gunNode, setGunNode] = useState<any>(null);

  useEffect(() => {
    // Persistent initialisation via Gun (decentralized DB)
    const gun = Gun(['https://gun-manhattan.herokuapp.com/gun', 'https://relay.peer.ooo/gun']);
    const node = gun.get('day_app_v3_prod_final'); 
    setGunNode(node);

    // Listen for data changes
    node.map().on((data: any, id: string) => {
      if (data) {
        setEvents(current => {
          const filtered = current.filter(e => e.id !== id);
          const attendees = data.attendees ? JSON.parse(data.attendees) : [];
          const location = data.location ? JSON.parse(data.location) : undefined;
          return [...filtered, { ...data, id, attendees, location }].sort((a, b) => {
            const m1 = MONTHS.indexOf(a.month);
            const m2 = MONTHS.indexOf(b.month);
            if (m1 !== m2) return m1 - m2;
            const d1 = parseInt(a.date.match(/\d+/)?.[0] || '0');
            const d2 = parseInt(b.date.match(/\d+/)?.[0] || '0');
            return d1 - d2;
          });
        });
      } else {
        setEvents(current => current.filter(e => e.id !== id));
      }
    });
  }, []);

  // AI-powered event generation
  const handleCreate = async () => {
    if (!selectedMonth || !selectedType || !gunNode) return;
    setLoading(true);
    try {
      const response: GeminiEventResponse = await generateEventIdeas(selectedMonth, selectedType as EventType, inputName);
      const location = await suggestLocation(response.title, selectedMonth);
      
      const eventId = Math.random().toString(36).substring(7);
      const newEvent = {
        title: response.title,
        date: response.date,
        description: response.description,
        icon: response.icon,
        type: selectedType,
        month: selectedMonth,
        maxParticipants: response.maxParticipants,
        attendees: JSON.stringify([]),
        location: JSON.stringify(location),
        isAiGenerated: true
      };

      gunNode.get(eventId).put(newEvent);
      setInputName('');
      setSelectedType('');
    } catch (e) {
      console.error("Creation error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Delete an event
  const handleDelete = (id: string) => {
    if (gunNode) gunNode.get(id).put(null);
  };

  // Update an event (e.g. registrations)
  const handleUpdate = (id: string, updates: Partial<EventData>) => {
    if (!gunNode) return;
    const gunUpdates: any = { ...updates };
    if (updates.attendees) gunUpdates.attendees = JSON.stringify(updates.attendees);
    if (updates.location) gunUpdates.location = JSON.stringify(updates.location);
    gunNode.get(id).put(gunUpdates);
    
    if (activeEvent && activeEvent.id === id) {
      setActiveEvent(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] pb-20">
      <header className="max-w-6xl mx-auto pt-16 pb-12 px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-2">
              DAY<span className="text-indigo-600">.</span>
            </h1>
            <p className="text-slate-400 font-medium uppercase tracking-[0.2em] text-[10px]">L'organisateur d'événements propulsé par l'IA</p>
          </div>
          
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-wrap gap-4 items-center max-w-2xl">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 border-none"
            >
              <option value="">Mois</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value as EventType)}
              className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 border-none"
            >
              <option value="">Type</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <input 
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Nom (optionnel)"
              className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 border-none flex-1 min-w-[150px]"
            />

            <button 
              onClick={handleCreate}
              disabled={loading || !selectedMonth || !selectedType}
              className={`
                px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all
                ${loading ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200'}
              `}
            >
              {loading ? '...' : 'Générer'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {MONTHS.map(month => (
          <MonthSection 
            key={month} 
            month={month} 
            events={events.filter(e => e.month === month)}
            onEventClick={setActiveEvent}
            onDelete={handleDelete}
          />
        ))}
      </main>

      {activeEvent && (
        <RegistrationModal 
          event={activeEvent}
          canEdit={true}
          onClose={() => setActiveEvent(null)}
          onRegister={(name) => {
            const attendees = [...activeEvent.attendees, name];
            handleUpdate(activeEvent.id, { attendees });
          }}
          onUnregister={(idx) => {
            const attendees = activeEvent.attendees.filter((_, i) => i !== idx);
            handleUpdate(activeEvent.id, { attendees });
          }}
          onUpdateLocation={(name) => handleUpdate(activeEvent.id, { location: { ...activeEvent.location, name } })}
          onUpdateDate={(date) => handleUpdate(activeEvent.id, { date })}
          onUpdateDescription={(description) => handleUpdate(activeEvent.id, { description })}
          onUpdateMaxParticipants={(max) => handleUpdate(activeEvent.id, { maxParticipants: max })}
        />
      )}
    </div>
  );
};

// Fix: Adding missing default export for App
export default App;
