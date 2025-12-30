
import React, { useState, useEffect, useCallback } from 'react';
import { MONTHS, EVENT_TYPES, MONTH_THEMES } from './constants';
import { EventType, EventData } from './types';
import { generateEventIdeas, suggestLocation } from './services/geminiService';
import EventBubble from './components/EventBubble';
import RegistrationModal from './components/RegistrationModal';

const SESSION_ID = Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [inputName, setInputName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedType, setSelectedType] = useState<EventType | ''>('');
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  
  const [currentEditorId, setCurrentEditorId] = useState<string | null>(null);

  useEffect(() => {
    const syncLock = () => {
      const lock = localStorage.getItem('eventspark_lock');
      setCurrentEditorId(lock);
    };

    syncLock();
    window.addEventListener('storage', syncLock);
    return () => window.removeEventListener('storage', syncLock);
  }, []);

  const canEdit = !currentEditorId || currentEditorId === SESSION_ID;
  const isOwner = currentEditorId === SESSION_ID;

  const takeControl = () => {
    localStorage.setItem('eventspark_lock', SESSION_ID);
    setCurrentEditorId(SESSION_ID);
  };

  const releaseControl = () => {
    localStorage.removeItem('eventspark_lock');
    setCurrentEditorId(null);
  };

  const handleAddEvent = async () => {
    if (!selectedMonth || !selectedType || !canEdit) return;

    if (!currentEditorId) takeControl();

    setLoading(true);
    try {
      const usedIcons = events.map(e => e.icon);
      
      const idea = await generateEventIdeas(selectedMonth, selectedType, inputName, usedIcons);
      const finalTitle = inputName.trim() || idea.title;
      const location = await suggestLocation(finalTitle, selectedMonth);

      // Le nombre de participants est strictement limité à 4 par défaut à la création
      const defaultMaxParticipants = 4;

      const newEvent: EventData = {
        id: Math.random().toString(36).substr(2, 9),
        title: finalTitle,
        date: idea.date,
        description: idea.description,
        icon: idea.icon, 
        type: selectedType,
        month: selectedMonth,
        attendees: [],
        maxParticipants: defaultMaxParticipants,
        location: location
      };

      setEvents(prev => [...prev, newEvent]);
      setInputName('');
      
      const monthElement = document.getElementById(`month-${selectedMonth}`);
      monthElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
      console.error("Failed to add event", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (name: string) => {
    if (activeEvent && canEdit) {
      const updatedEvent = { ...activeEvent, attendees: [...activeEvent.attendees, name] };
      setEvents(prev => prev.map(e => 
        e.id === activeEvent.id ? updatedEvent : e
      ));
      setActiveEvent(updatedEvent);
    }
  };

  const handleUnregister = (index: number) => {
    if (activeEvent && canEdit) {
      const newAttendees = [...activeEvent.attendees];
      newAttendees.splice(index, 1);
      const updatedEvent = { ...activeEvent, attendees: newAttendees };
      setEvents(prev => prev.map(e => 
        e.id === activeEvent.id ? updatedEvent : e
      ));
      setActiveEvent(updatedEvent);
    }
  };

  const handleDeleteEvent = (id: string) => {
    if (canEdit) {
      setEvents(prev => prev.filter(event => event.id !== id));
    }
  };

  const handleUpdateField = (id: string, field: keyof EventData, value: any) => {
    if (canEdit) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    }
  };

  const handleUpdateLocation = (locationName: string) => {
    if (activeEvent && canEdit) {
      const updatedLocation = {
        ...activeEvent.location,
        name: locationName,
        mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`
      };
      handleUpdateField(activeEvent.id, 'location', updatedLocation);
      setActiveEvent({ ...activeEvent, location: updatedLocation });
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 md:py-20 flex flex-col items-center max-w-[1700px] mx-auto overflow-x-hidden">
      <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
        {!isOwner && currentEditorId ? (
          <div className="bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 border border-amber-400">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest">Mode Lecture Seule</span>
          </div>
        ) : isOwner ? (
          <button 
            onClick={releaseControl}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 border border-emerald-400 transition-all active:scale-95"
          >
            <span className="text-xs font-black uppercase tracking-widest">Vous éditez</span>
            <div className="bg-white/20 p-1 rounded-md text-[10px]">LIBÉRER</div>
          </button>
        ) : (
          <button 
            onClick={takeControl}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 border border-indigo-400 transition-all active:scale-95"
          >
            <span className="text-xs font-black uppercase tracking-widest">Prendre la main</span>
          </button>
        )}
      </div>

      <header className={`w-full text-center mb-24 relative transition-opacity duration-500 ${!canEdit ? 'opacity-50' : 'opacity-100'}`}>
        <div className="absolute -top-20 left-1/4 w-72 h-72 bg-emerald-300/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>
        <div className="absolute -top-10 right-1/4 w-72 h-72 bg-indigo-300/20 rounded-full blur-[100px] -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tighter">
          Day <span className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 via-teal-500 to-lime-500 inline-block drop-shadow-sm">🧵</span>
        </h1>
        <p className="text-slate-400 mb-12 font-bold tracking-[0.2em] uppercase text-[10px]">
          Planifiez vos moments d'exception
        </p>

        <div className="relative group max-w-5xl mx-auto">
          {canEdit && (
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-lime-500 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          )}
          
          <div className={`relative glass p-6 md:p-10 rounded-[2.8rem] shadow-2xl shadow-indigo-200/50 w-full flex flex-col lg:flex-row gap-8 items-end bg-white/90 border border-white/80 ${!canEdit && 'pointer-events-none'}`}>
            <div className="flex-[2] w-full space-y-3 text-left">
              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Nom de l'événement
              </label>
              <input 
                type="text"
                disabled={!canEdit}
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder={canEdit ? "Ex: Anniversaire surprise..." : "Édition verrouillée"}
                className="w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl px-6 py-4.5 focus:ring-4 focus:ring-emerald-100/50 focus:border-emerald-400 outline-none transition-all text-slate-700 font-bold placeholder:text-slate-300 shadow-inner"
              />
            </div>

            <div className="flex-1 w-full space-y-3 text-left">
              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Mois
              </label>
              <div className="relative">
                <select 
                  disabled={!canEdit}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl px-6 py-4.5 focus:ring-4 focus:ring-emerald-100/50 focus:border-emerald-400 outline-none transition-all cursor-pointer text-slate-700 font-bold appearance-none shadow-inner"
                >
                  <option value="">Choisir...</option>
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3 text-left">
              <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Type
              </label>
              <div className="relative">
                <select 
                  disabled={!canEdit}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as EventType)}
                  className="w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl px-6 py-4.5 focus:ring-4 focus:ring-emerald-100/50 focus:border-emerald-400 outline-none transition-all cursor-pointer text-slate-700 font-bold appearance-none shadow-inner"
                >
                  <option value="">Choisir...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddEvent}
              disabled={loading || !selectedMonth || !selectedType || !canEdit}
              className={`
                w-full lg:w-auto px-12 py-4.5 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 group/btn overflow-hidden relative
                ${loading || !selectedMonth || !selectedType || !canEdit 
                  ? 'bg-slate-200 cursor-not-allowed text-slate-400' 
                  : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-lime-500 hover:shadow-emerald-200/50'}
              `}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5 group-hover/btn:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    CRÉER
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-20">
        {MONTHS.map((month, index) => {
          const monthEvents = events.filter(e => e.month === month);
          const theme = MONTH_THEMES[month];
          return (
            <section 
              key={month} 
              id={`month-${month}`}
              className={`
                group relative flex flex-col min-h-[400px] p-8 rounded-[3.5rem] border transition-all duration-500 
                hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-1
                ${theme.bg} ${theme.border}
              `}
            >
              <div className={`absolute top-8 right-8 text-8xl font-black opacity-[0.03] select-none group-hover:opacity-[0.07] transition-opacity duration-500 ${theme.text}`}>
                {(index + 1).toString().padStart(2, '0')}
              </div>
              
              <div className="relative mb-8 flex items-center justify-between">
                <h2 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${theme.text}`}>
                  <span className={`w-2 h-8 rounded-full shadow-sm ${theme.accent}`}></span>
                  {month}
                </h2>
              </div>
              
              <div className="flex-1 flex flex-wrap content-start justify-center gap-6 relative z-10">
                {monthEvents.length > 0 ? (
                  monthEvents.map(event => (
                    <EventBubble 
                      key={event.id} 
                      event={event} 
                      canEdit={canEdit}
                      onClick={() => setActiveEvent(event)} 
                      onDelete={() => handleDeleteEvent(event.id)}
                    />
                  ))
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center space-y-3 py-10">
                    <div className={`w-14 h-14 rounded-[2rem] bg-white/50 flex items-center justify-center border-2 border-dashed ${theme.border} group-hover:scale-110 transition-transform`}>
                      <span className="text-xl grayscale group-hover:grayscale-0 transition-all duration-500 opacity-20 group-hover:opacity-60">✨</span>
                    </div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] text-center max-w-[120px] leading-relaxed opacity-30 ${theme.text}`}>
                      Libre
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>

      {activeEvent && (
        <RegistrationModal 
          event={activeEvent} 
          canEdit={canEdit}
          onClose={() => setActiveEvent(null)} 
          onRegister={handleRegister} 
          onUnregister={handleUnregister}
          onUpdateLocation={handleUpdateLocation}
          onUpdateDate={(val) => handleUpdateField(activeEvent.id, 'date', val)}
          onUpdateDescription={(val) => handleUpdateField(activeEvent.id, 'description', val)}
          onUpdateMaxParticipants={(val) => {
            handleUpdateField(activeEvent.id, 'maxParticipants', val);
            setActiveEvent({ ...activeEvent, maxParticipants: val });
          }}
        />
      )}

      <footer className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] pb-12 text-center w-full opacity-50">
        &copy; {new Date().getFullYear()} Day <span className="inline-block">🧵</span> — L'élégance de l'organisation
      </footer>
    </div>
  );
};

export default App;
