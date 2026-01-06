
import React, { useState } from 'react';
import { EventData } from '../types';
import EventBubble from './EventBubble';

interface BubbleStackProps {
  events: EventData[];
  canEdit: boolean;
  onEventClick: (event: EventData) => void;
  onEventDelete: (id: string) => void;
}

const BubbleStack: React.FC<BubbleStackProps> = ({ events, canEdit, onEventClick, onEventDelete }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (events.length === 0) return null;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % events.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  // Si 1 ou 2 événements, on les affiche normalement côte à côte
  if (events.length <= 2) {
    return (
      <div className="flex flex-wrap justify-center gap-6">
        {events.map((event) => (
          <EventBubble
            key={event.id}
            event={event}
            canEdit={canEdit}
            onClick={() => onEventClick(event)}
            onDelete={() => onEventDelete(event.id)}
          />
        ))}
      </div>
    );
  }

  // Si plus de 2, on active l'empilement uniforme de gauche à droite
  const visibleEvents = [];
  for (let i = 0; i < Math.min(events.length, 3); i++) {
    const index = (activeIndex + i) % events.length;
    visibleEvents.push({ event: events[index], isBackground: i > 0, depth: i });
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
              // Décalage horizontal réduit de moitié (15px au lieu de 30px)
              // translateX(-depth * 15px) : les bulles derrière apparaissent légèrement sur la gauche.
              transform: isBackground 
                ? `translateX(-${depth * 15}px)` 
                : 'translateX(0)',
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
        {events.map((_, idx) => (
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
