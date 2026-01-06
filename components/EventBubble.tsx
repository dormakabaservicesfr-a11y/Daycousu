
import React, { useState } from 'react';
import { EventData } from '../types';
import { TYPE_COLORS, MONTHS } from '../constants';

interface EventBubbleProps {
  event: EventData;
  canEdit: boolean;
  isActive: boolean; // Nouvelle prop pour gérer la visibilité des contrôles
  onClick: () => void;
  onDelete: () => void;
}

const EventBubble: React.FC<EventBubbleProps> = ({ event, canEdit, isActive, onClick, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Calcul de l'expiration (passé de plus de 24h)
  const isExpired = React.useMemo(() => {
    try {
      const monthIndex = MONTHS.indexOf(event.month);
      const dayMatch = event.date.match(/\d+/);
      if (monthIndex === -1 || !dayMatch) return false;

      const day = parseInt(dayMatch[0]);
      const now = new Date();
      const currentYear = now.getFullYear();
      
      const eventDate = new Date(currentYear, monthIndex, day, 12, 0, 0);
      
      const diffMs = now.getTime() - eventDate.getTime();
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      
      return diffMs > twentyFourHoursMs;
    } catch (e) {
      return false;
    }
  }, [event.date, event.month]);

  const colorClass = isConfirmingDelete 
    ? 'bg-red-500 text-white shadow-red-200/50' 
    : isExpired
      ? 'bg-slate-400 text-slate-100 shadow-slate-200/50 grayscale opacity-80'
      : TYPE_COLORS[event.type];
    
  const count = event.attendees.length;
  const isReached = count === event.maxParticipants;
  const isExceeded = count > event.maxParticipants;

  const handleCopyLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isActive) return;
    const locationText = event.location?.name || "Lieu non défini";
    navigator.clipboard.writeText(locationText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleToggleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit || !isActive) return;
    setIsConfirmingDelete(true);
  };

  const formattedDate = event.date.replace(/^Le\s+/i, '');

  return (
    <div 
      onClick={!isConfirmingDelete && isActive ? onClick : undefined}
      className={`
        relative w-40 h-40 rounded-full flex flex-col items-center justify-center p-4 
        cursor-pointer transform transition-all duration-500 
        animate-float shadow-lg text-center z-10
        ${isActive ? 'hover:scale-110 hover:-rotate-3 shadow-xl' : 'scale-90 opacity-40 cursor-default pointer-events-none shadow-none'}
        ${colorClass}
        ${isActive && !isConfirmingDelete && !isExpired && isReached ? 'ring-4 ring-emerald-500/30' : ''}
        ${isActive && !isConfirmingDelete && !isExpired && isExceeded ? 'ring-4 ring-rose-500/30' : ''}
      `}
    >
      {isConfirmingDelete && isActive ? (
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
          <div className={`flex flex-col items-center transform -translate-y-[10%] w-full transition-opacity duration-300 ${!isActive ? 'opacity-80' : ''}`}>
            <span className={`text-3xl mb-1 ${isExpired ? 'opacity-50' : ''}`}>{event.icon}</span>
            <h3 className="font-bold text-[11px] leading-tight mb-0.5 line-clamp-2 uppercase tracking-wide px-2">
              {event.title}
            </h3>
            <p className="text-[9px] font-bold opacity-80">{formattedDate}</p>
            {isExpired && (
              <span className="text-[8px] mt-1 font-black opacity-60 uppercase tracking-tighter">Terminé</span>
            )}
          </div>
          
          {/* Boutons et indicateurs : visibles uniquement si isActive est vrai */}
          {isActive && (
            <>
              {canEdit && (
                <button 
                  onClick={handleToggleDelete}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-90 z-20 animate-in fade-in scale-in duration-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                  </svg>
                </button>
              )}

              <button 
                onClick={handleCopyLocation}
                className={`absolute bottom-2 left-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 ${copied ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-slate-700 hover:scale-110 hover:shadow-xl'}`}
                title="Copier le lieu"
              >
                {copied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill={isExpired ? "#94a3b8" : "url(#mapsGradient)"} />
                    {!isExpired && (
                      <defs>
                        <linearGradient id="mapsGradient" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#EA4335" />
                          <stop offset="0.33" stopColor="#FBBC04" />
                          <stop offset="0.66" stopColor="#34A853" />
                          <stop offset="1" stopColor="#4285F4" />
                        </linearGradient>
                      </defs>
                    )}
                  </svg>
                )}
              </button>

              <div 
                className={`
                  absolute bottom-2 right-2 w-9 h-9 rounded-full flex flex-col items-center justify-center shadow-md font-black border transition-all leading-none animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75
                  ${isExpired ? 'bg-slate-200 text-slate-500 border-slate-300' : (isExceeded ? 'bg-rose-500 text-white border-rose-400' : isReached ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white text-slate-800 border-slate-100')}
                `}
              >
                <span className="text-[10px]">{count}</span>
                <div className="w-4 h-[1px] bg-current opacity-30 my-0.5"></div>
                <span className="text-[8px] opacity-70">{event.maxParticipants}</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EventBubble;
