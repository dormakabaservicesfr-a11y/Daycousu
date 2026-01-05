
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
  
  // Si on confirme la suppression, on force un rouge vif, sinon on utilise la couleur du type
  const colorClass = isConfirmingDelete 
    ? 'bg-red-500 text-white shadow-red-200/50' 
    : TYPE_COLORS[event.type];
    
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

  return (
    <div 
      onClick={!isConfirmingDelete ? onClick : undefined}
      className={`
        relative w-40 h-40 rounded-full flex flex-col items-center justify-center p-4 
        cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-rotate-3
        animate-float shadow-lg hover:shadow-xl text-center z-10
        ${colorClass}
        ${!isConfirmingDelete && isReached ? 'ring-4 ring-emerald-500/30' : ''}
        ${!isConfirmingDelete && isExceeded ? 'ring-4 ring-rose-500/30' : ''}
      `}
    >
      {/* Badge IA */}
      {event.isAiGenerated && !isConfirmingDelete && (
        <div className="absolute -top-1 -left-1 bg-white/90 text-[8px] font-black text-indigo-600 px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 flex items-center gap-0.5 animate-pulse">
          <span>✨</span> AI
        </div>
      )}

      {isConfirmingDelete ? (
        <div className="flex flex-col items-center justify-center space-y-2 w-full animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-sm">Supprimer ?</p>
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="bg-white text-red-600 px-4 py-1.5 rounded-full text-[10px] font-black shadow-md hover:scale-105 transition-transform"
            >
              OUI
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsConfirmingDelete(false); }} 
              className="bg-red-600/50 text-white border border-white/30 px-4 py-1.5 rounded-full text-[10px] font-black hover:bg-red-600 transition-colors"
            >
              NON
            </button>
          </div>
        </div>
      ) : (
        <>
          <span className="text-3xl mb-1">{event.icon}</span>
          <h3 className="font-bold text-[11px] leading-tight mb-0.5 line-clamp-2 uppercase tracking-wide px-2">
            {event.title}
          </h3>
          <p className="text-[9px] font-bold opacity-80">{event.date}</p>
          
          {canEdit && (
            <button 
              onClick={handleToggleDelete}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-90 z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            </button>
          )}

          <button 
            onClick={handleCopyLocation}
            className={`absolute bottom-2 left-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all ${copied ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-slate-700 hover:scale-110 hover:shadow-xl'}`}
            title="Copier le lieu"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="url(#compassGradient)" strokeWidth="1.5"/>
                <path d="M12 6L14 12L12 18L10 12L12 6Z" fill="url(#compassGradient)" />
                <circle cx="12" cy="12" r="1.5" fill="white" />
                <defs>
                  <linearGradient id="compassGradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2DD4BF" />
                    <stop offset="1" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </button>

          <div className={`absolute -bottom-1 -right-4 text-[7px] px-3 py-1.5 rounded-full flex items-center justify-center shadow-md font-black border transition-all ${isExceeded ? 'bg-rose-500 text-white' : isReached ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800'}`}>
            {count}/{event.maxParticipants}
          </div>
        </>
      )}
    </div>
  );
};

export default EventBubble;
