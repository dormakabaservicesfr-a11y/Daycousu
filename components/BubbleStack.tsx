
import React, { useState, useMemo, useEffect } from 'react';
import { EventData } from '../types';
import EventBubble from './EventBubble';
import { MONTHS } from '../constants';

interface BubbleStackProps {
  events: EventData[];
  canEdit: boolean;
  onEventClick: (event: EventData) => void;
  onEventDelete: (id: string) => void;
}

const BubbleStack: React.FC<BubbleStackProps> = ({ events, canEdit, onEventClick, onEventDelete }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Helper pour parser la date "JOUR MOIS"
  const parseEventDate = (dateStr: string): Date => {
    const now = new Date();
    const [dayStr, monthStr] = dateStr.split(' ');
    const day = parseInt(dayStr);
    const monthIndex = MONTHS.indexOf(monthStr);
    if (monthIndex === -1 || isNaN(day)) return new Date(0);
    return new Date(now.getFullYear(), monthIndex, day);
  };

  // Tri des événements : Futurs d'abord (du plus proche au plus lointain), puis Passés (du plus récent au plus ancien)
  const sortedEvents = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();

    const checkIsExpired = (dateStr: string) => {
      const [dayStr, monthStr] = dateStr.split(' ');
      const day = parseInt(dayStr);
      const monthIndex = MONTHS.indexOf(monthStr);
      if (monthIndex === -1 || isNaN(day)) return true;
      
      const eventDate = new Date(now.getFullYear(), monthIndex, day);
      // Un événement est expiré 24h après le début de sa journée (même logique que EventBubble)
      const threshold = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
      return nowTime > threshold.getTime();
    };

    const upcoming = events
      .filter(e => !checkIsExpired(e.date))
      .sort((a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime());

    const expired = events
      .filter(e => checkIsExpired(e.date))
      .sort((a, b) => parseEventDate(b.date).getTime() - parseEventDate(a.date).getTime());

    return [...upcoming, ...expired];
  }, [events]);

  // Réinitialiser l'index si la liste change (pour rester sur l'événement prioritaire par défaut)
  useEffect(() => {
    setActiveIndex(0);
  }, [events.length]);

  if (sortedEvents.length === 0) return null;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % sortedEvents.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + sortedEvents.length) % sortedEvents.length);
  };

  // Si seulement 1 événement, on l'affiche centré dans le même conteneur de hauteur fixe que la pile
  if (sortedEvents.length < 2) {
    return (
      <div className="relative w-full h-56 flex items-center justify-center">
        <div className="relative w-40 h-40">
          <EventBubble
            event={sortedEvents[0]}
            canEdit={canEdit}
            onClick={() => onEventClick(sortedEvents[0])}
            onDelete={() => onEventDelete(sortedEvents[0].id)}
          />
        </div>
      </div>
    );
  }

  // Si 2 ou plus, on active l'empilement (Stack)
  const visibleEvents = [];
  const count = sortedEvents.length;
  // On affiche jusqu'à 3 bulles dans l'aperçu de la pile
  for (let i = 0; i < Math.min(count, 3); i++) {
    const index = (activeIndex + i) % count;
    visibleEvents.push({ event: sortedEvents[index], isBackground: i > 0, depth: i });
  }

  return (
    <div className="relative w-full h-56 flex items-center justify-center select-none group/stack">
      {/* Flèches de navigation - visibles au survol */}
      <button 
        onClick={prev}
        className="absolute left-[-20px] z-[70] p-2.5 bg-white/90 backdrop-blur hover:bg-white rounded-full shadow-xl transition-all active:scale-90 opacity-0 group-hover/stack:opacity-100 border border-slate-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="relative flex items-center justify-center w-40 h-40">
        {/* On affiche les bulles : les plus profondes d'abord (plus à gauche) */}
        {visibleEvents.reverse().map(({ event, isBackground, depth }) => (
          <div 
            key={event.id}
            className="absolute transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ 
              // Décalage horizontal augmenté de 10% supplémentaire (16.5px -> 18.15px)
              transform: isBackground 
                ? `translateX(-${depth * 18.15}px) scale(${1 - depth * 0.05})` 
                : 'translateX(0) scale(1)',
              zIndex: 30 - depth,
              opacity: 1 - depth * 0.25
            }}
          >
            <EventBubble
              event={event}
              canEdit={canEdit}
              isBackground={isBackground}
              onClick={() => onEventClick(event)}
              onDelete={() => onEventDelete(event.id)}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={next}
        className="absolute right-[-20px] z-[70] p-2.5 bg-white/90 backdrop-blur hover:bg-white rounded-full shadow-xl transition-all active:scale-90 opacity-0 group-hover/stack:opacity-100 border border-slate-100"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicateur de pagination */}
      <div className="absolute -bottom-6 flex gap-1.5">
        {sortedEvents.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeIndex ? 'w-5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'w-1.5 bg-slate-300'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BubbleStack;
