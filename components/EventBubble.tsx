import React, { useState } from 'react';
import { EventData } from '../types';
import { TYPE_COLORS } from '../constants';

interface EventBubbleProps {
  event: EventData;
  canEdit: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const EventBubble: React.FC<EventBubbleProps> = ({ event, canEdit, onClick, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const colorClass = TYPE_COLORS[event.type];
  const count = event.attendees.length;
  const isReached = count === event.maxParticipants;
  const isExceeded = count > event.maxParticipants;

  const handleCopyLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const locationText = event.location?.name || "Lieu non défini";
    navigator.clipboard.writeText(locationText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setIsConfirmingDelete(true);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmingDelete(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    onDelete();
  };

  return (
    <div 
      onClick={!isConfirmingDelete ? onClick : undefined}
      className={`
        relative w-40 h-40 rounded-full flex flex-col items-center justify-center p-4 
        cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-rotate-3
        animate-float shadow-lg hover:shadow-xl text-center z-10
        ${colorClass}
        ${isReached ? 'ring-4 ring-emerald-500/30' : ''}
        ${isExceeded ? 'ring-4 ring-rose-500/30' : ''}
      `}
    >
      {isConfirmingDelete ? (
        <div className="flex flex-col items-center justify-center space-y-2 w-full animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-sm">Supprimer ?</p>
          <div className="flex gap-2">
            <button 
              onClick={handleConfirmDelete}
              className="bg-white/90 text-red-600 px-3 py-1 rounded-full text-[10px] font-black hover:bg-white transition-colors"
            >
              OUI
            </button>
            <button 
              onClick={handleCancelDelete}
              className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black hover:bg-white/40 transition-colors"
            >
              NON
            </button>
          </div>
        </div>
      ) : (
        <>
          <span className="text-3xl mb-1 filter drop-shadow-sm">{event.icon}</span>
          <h3 className="font-bold text-[11px] leading-tight mb-0.5 line-clamp-2 uppercase tracking-wide px-2">
            {event.title}
          </h3>
          <p className="text-[9px] font-bold opacity-80">{event.date}</p>
          
          {canEdit && (
            <button 
              onClick={handleToggleDelete}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-90 z-20 hover:bg-red-600 group/del"
              title="Supprimer l'événement"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            </button>
          )}

          <button 
            onClick={handleCopyLocation}
            className={`
              absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all 
              hover:scale-110 active:scale-90 z-20
              ${copied ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'}
            `}
            title="Copier l'adresse"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>

          <div className={`
            absolute -bottom-1 -right-4 text-[7px] px-3 py-1.5 rounded-full flex items-center justify-center shadow-md font-black border whitespace-nowrap transition-all duration-300
            ${isExceeded ? 'bg-rose-500 text-white border-rose-400 scale-110' : 
              isReached ? 'bg-emerald-500 text-white border-emerald-400 scale-110' : 
              'bg-white text-slate-800 border-slate-100'}
          `}>
            {count}/{event.maxParticipants} participant{count > 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
};

export default EventBubble;