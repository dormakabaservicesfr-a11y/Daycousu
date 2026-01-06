
import React, { useState, useMemo } from 'react';
import { EventData } from '../types';
import { TYPE_COLORS, MONTHS } from '../constants';

interface EventBubbleProps {
  event: EventData;
  canEdit: boolean;
  isBackground?: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const EventBubble: React.FC<EventBubbleProps> = ({ 
  event, 
  canEdit, 
  isBackground = false,
  onClick, 
  onDelete 
}) => {
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Détection si l'événement est passé de plus de 1 jour
  const isExpired = useMemo(() => {
    try {
      const now = new Date();
      const [dayStr, monthStr] = event.date.split(' ');
      const day = parseInt(dayStr);
      const monthIndex = MONTHS.indexOf(monthStr);

      if (monthIndex === -1 || isNaN(day)) return false;

      // Création d'une date pour l'année en cours
      const eventDate = new Date(now.getFullYear(), monthIndex, day);
      
      // Seuil : 24 heures après le début de la journée de l'événement
      const threshold = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
      
      return now > threshold;
    } catch (e) {
      return false;
    }
  }, [event.date]);

  const colorClass = isConfirmingDelete 
    ? 'bg-red-500 text-white shadow-red-200/50' 
    : isExpired 
      ? 'bg-slate-400 text-slate-100 shadow-slate-200/30' 
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
        cursor-pointer transition-all duration-500
        ${!isBackground && !isExpired ? 'animate-float shadow-lg hover:shadow-xl hover:scale-105' : 'shadow-md'}
        ${colorClass}
        ${!isConfirmingDelete && isReached && !isBackground && !isExpired ? 'ring-4 ring-emerald-500/30' : ''}
        ${!isConfirmingDelete && isExceeded && !isBackground && !isExpired ? 'ring-4 ring-rose-500/30' : ''}
        ${isBackground ? 'opacity-40 pointer-events-none' : 'opacity-100'}
        ${isExpired ? 'grayscale-[0.5] grayscale hover:grayscale-0 transition-[filter]' : ''}
      `}
    >
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
          <div className={`flex flex-col items-center transition-all duration-500 ${isBackground ? 'scale-90' : '-translate-y-4'}`}>
            {!isBackground && <span className={`text-3xl mb-1 ${isExpired ? 'opacity-50' : ''}`}>{event.icon}</span>}
            <h3 className="font-bold text-[11px] leading-tight mb-0.5 line-clamp-2 uppercase tracking-wide px-2 text-center">
              {event.title}
            </h3>
            <p className={`text-[9px] font-bold ${isExpired ? 'opacity-50' : 'opacity-80'}`}>
              {event.date} {isExpired && ' (Passé)'}
            </p>
          </div>
          
          {canEdit && !isBackground && (
            <button 
              onClick={handleToggleDelete}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-90 z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            </button>
          )}

          {!isBackground && (
            <>
              {/* Bouton Google Maps (Copie) */}
              <button 
                onClick={handleCopyLocation}
                className={`absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${copied ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-slate-700 hover:scale-110 hover:shadow-xl border border-slate-50'}`}
                title="Copier le lieu"
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 48 48" className={`h-6 w-6 ${isExpired ? 'opacity-40 grayscale' : ''}`} xmlns="http://www.w3.org/2000/svg">
                    {/* Top: Red */}
                    <path fill="#EA4335" d="M24 4c-7.73 0-14 6.27-14 14 0 3.1 1.01 6.13 2.87 8.65L24 18V4z"/>
                    {/* Right: Yellow */}
                    <path fill="#FBBC04" d="M24 4v14l11.13 8.65C36.99 24.13 38 21.1 38 18c0-7.73-6.27-14-14-14z"/>
                    {/* Bottom: Green */}
                    <path fill="#34A853" d="M12.87 26.65L24 42l11.13-15.35L24 18l-11.13 8.65z"/>
                    {/* Center: Blue */}
                    <path fill="#4285F4" d="M24 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
                  </svg>
                )}
              </button>

              {/* Badge Participants */}
              <div className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg font-black border transition-all text-[8px] ${isExpired ? 'bg-slate-300 text-slate-600 border-slate-400/20' : isExceeded ? 'bg-rose-500 text-white border-rose-400' : isReached ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-slate-800 border-slate-100'}`}>
                {count}/{event.maxParticipants}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EventBubble;
