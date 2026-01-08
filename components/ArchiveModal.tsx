
import React from 'react';
import { EventData } from '../types';

interface ArchiveModalProps {
  events: EventData[];
  onClose: () => void;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({ events, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-[0_30px_100px_rgba(0,0,0,0.3)] transform transition-all animate-in zoom-in-95 duration-500 border border-white/40">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="text-4xl">📁</span> Archives
            </h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-70">Vos souvenirs cousus main</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Événement</th>
                <th className="px-6 py-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    Aucun événement archivé pour le moment.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl group-hover:scale-125 transition-transform">{event.icon}</span>
                        <span className="font-bold text-slate-700 text-sm">{event.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-black text-slate-400 group-hover:text-emerald-500 transition-colors uppercase tracking-wider">
                        {event.date}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-50">
            Les événements sont archivés automatiquement après 2 mois
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArchiveModal;
