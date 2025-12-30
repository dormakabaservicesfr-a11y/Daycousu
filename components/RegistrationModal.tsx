import React, { useState } from 'react';
import { EventData } from '../types';
import { TYPE_COLORS } from '../constants';

interface RegistrationModalProps {
  event: EventData;
  canEdit: boolean;
  onClose: () => void;
  onRegister: (name: string) => void;
  onUnregister: (index: number) => void;
  onUpdateLocation: (locationName: string) => void;
  onUpdateDate: (date: string) => void;
  onUpdateDescription: (description: string) => void;
  onUpdateMaxParticipants: (max: number) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ 
  event, 
  canEdit,
  onClose, 
  onRegister, 
  onUnregister,
  onUpdateLocation,
  onUpdateDate,
  onUpdateDescription,
  onUpdateMaxParticipants
}) => {
  const [name, setName] = useState('');
  
  const typeColorClass = TYPE_COLORS[event.type].split(' ')[0]; 
  
  const [locationInput, setLocationInput] = useState(event.location?.name || '');
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  const [dateInput, setDateInput] = useState(event.date);
  const [isEditingDate, setIsEditingDate] = useState(false);

  const [descriptionInput, setDescriptionInput] = useState(event.description);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const [maxInput, setMaxInput] = useState(event.maxParticipants.toString());
  const [isEditingMax, setIsEditingMax] = useState(false);

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRegister(name.trim());
      setName('');
    }
  };

  const handleSaveLocation = () => {
    if (locationInput.trim() && canEdit) {
      onUpdateLocation(locationInput.trim());
      setIsEditingLocation(false);
    }
  };

  const handleSaveMax = () => {
    const val = parseInt(maxInput);
    if (!isNaN(val) && val > 0 && canEdit) {
      onUpdateMaxParticipants(val);
      setIsEditingMax(false);
    }
  };

  const isFull = event.attendees.length >= event.maxParticipants;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all overflow-y-auto max-h-[90vh] border-t-8 border-t-transparent relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-2 ${typeColorClass}`}></div>
        
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{event.icon}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest ${typeColorClass}`}>
                {event.type}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{event.title}</h2>
            
            <div className="mt-1 group">
              {isEditingDate && canEdit ? (
                <input 
                  type="text"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="px-2 py-1 text-sm border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  onBlur={() => { onUpdateDate(dateInput); setIsEditingDate(false); }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-indigo-600 font-bold text-sm uppercase tracking-wider">{event.date}</p>
                  {canEdit && (
                    <button onClick={() => setIsEditingDate(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-indigo-600">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 group">
          {isEditingDescription && canEdit ? (
            <div className="space-y-2">
              <textarea 
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                autoFocus
              />
              <button 
                onClick={() => { onUpdateDescription(descriptionInput); setIsEditingDescription(false); }}
                className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
              >
                Sauvegarder
              </button>
            </div>
          ) : (
            <div className="relative">
              <p 
                className={`text-gray-600 leading-relaxed text-sm italic border-l-4 border-indigo-100 pl-4 py-2 ${canEdit ? 'cursor-pointer hover:bg-slate-50' : ''}`} 
                onClick={() => canEdit && setIsEditingDescription(true)}
              >
                {event.description}
              </p>
            </div>
          )}
        </div>

        <div className="mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Localisation
            </h4>
            {!isEditingLocation && canEdit && (
              <button onClick={() => setIsEditingLocation(true)} className="text-[10px] text-indigo-600 font-bold">Modifier</button>
            )}
          </div>
          {isEditingLocation && canEdit ? (
            <div className="space-y-2">
              <input 
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveLocation} className="flex-1 bg-slate-800 text-white text-xs font-bold py-2 rounded-lg">Enregistrer</button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">{event.location?.name}</span>
              {event.location?.mapsUri && (
                <a href={event.location.mapsUri} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-bold">Maps</a>
              )}
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Participants ({event.attendees.length}/{event.maxParticipants})
            </h4>
            {!isEditingMax && canEdit && (
              <button onClick={() => setIsEditingMax(true)} className="text-[10px] text-indigo-600 font-bold">Capacité</button>
            )}
          </div>
          
          {isEditingMax && canEdit ? (
            <div className="flex gap-2 mb-4">
              <input 
                type="number"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className="w-20 px-3 py-1 text-sm rounded-lg border border-slate-200"
                autoFocus
              />
              <button onClick={handleSaveMax} className="bg-slate-800 text-white text-[10px] px-3 py-1 rounded-lg">OK</button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {event.attendees.length === 0 ? (
              <p className="text-slate-400 italic text-xs">Personne n'est encore inscrit.</p>
            ) : (
              event.attendees.map((attendee, idx) => {
                const isOverLimit = idx >= event.maxParticipants;
                return (
                  <div 
                    key={idx} 
                    className={`
                      px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-all group/item
                      ${isOverLimit 
                        ? 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'}
                    `}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOverLimit ? 'bg-rose-400' : 'bg-indigo-400'}`}></div>
                    {attendee}
                    {isOverLimit && <span className="text-[8px] opacity-70 ml-1 shrink-0">(L. d'attente)</span>}
                    
                    {canEdit && (
                      <button 
                        onClick={() => onUnregister(idx)}
                        className="ml-1 opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-red-600 p-0.5 rounded hover:bg-black/5"
                        title="Retirer le participant"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {isFull && (
            <p className="mt-3 text-[10px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">
              ⚠️ Capacité maximale atteinte
            </p>
          )}
        </div>

        {canEdit ? (
          <div className="pt-4 border-t border-slate-100">
            <form onSubmit={handleSubmitRegistration} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 ml-1 uppercase tracking-widest">S'inscrire</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Votre prénom"
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-medium"
                    required
                  />
                  <button 
                    type="submit"
                    className={`${typeColorClass} text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Inscriptions fermées (Lecture seule)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationModal;