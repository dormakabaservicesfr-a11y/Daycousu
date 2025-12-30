import { EventType } from './types';

export const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const MONTH_THEMES: Record<string, { bg: string, border: string, accent: string, text: string }> = {
  'Janvier': { bg: 'bg-blue-50/50', border: 'border-blue-100', accent: 'bg-blue-600', text: 'text-blue-900' },
  'Février': { bg: 'bg-sky-50/50', border: 'border-sky-100', accent: 'bg-sky-500', text: 'text-sky-900' },
  'Mars': { bg: 'bg-cyan-50/50', border: 'border-cyan-100', accent: 'bg-cyan-500', text: 'text-cyan-900' },
  'Avril': { bg: 'bg-teal-50/50', border: 'border-teal-100', accent: 'bg-teal-500', text: 'text-teal-900' },
  'Mai': { bg: 'bg-emerald-50/50', border: 'border-emerald-100', accent: 'bg-emerald-500', text: 'text-emerald-900' },
  'Juin': { bg: 'bg-lime-50/50', border: 'border-lime-100', accent: 'bg-lime-500', text: 'text-lime-900' },
  'Juillet': { bg: 'bg-yellow-50/50', border: 'border-yellow-100', accent: 'bg-yellow-500', text: 'text-yellow-900' },
  'Août': { bg: 'bg-orange-50/50', border: 'border-orange-100', accent: 'bg-orange-500', text: 'text-orange-900' },
  'Septembre': { bg: 'bg-amber-50/50', border: 'border-amber-100', accent: 'bg-amber-600', text: 'text-amber-900' },
  'Octobre': { bg: 'bg-orange-100/30', border: 'border-orange-200', accent: 'bg-orange-700', text: 'text-orange-950' },
  'Novembre': { bg: 'bg-slate-100/50', border: 'border-slate-200', accent: 'bg-slate-600', text: 'text-slate-900' },
  'Décembre': { bg: 'bg-indigo-50/50', border: 'border-indigo-100', accent: 'bg-indigo-600', text: 'text-indigo-900' },
};

export const EVENT_TYPES = [
  EventType.ACTIVITE,
  EventType.ANNIVERSAIRE,
  EventType.JOURNEE,
  EventType.SOIREE,
  EventType.VACANCES,
  EventType.WEEKEND
];

export const TYPE_COLORS: Record<EventType, string> = {
  [EventType.JOURNEE]: 'bg-amber-400 text-amber-950 shadow-amber-200/50',
  [EventType.SOIREE]: 'bg-indigo-900 text-white shadow-indigo-900/30',
  [EventType.WEEKEND]: 'bg-emerald-500 text-white shadow-emerald-500/30',
  [EventType.VACANCES]: 'bg-sky-400 text-white shadow-sky-400/30',
  [EventType.ACTIVITE]: 'bg-rose-600 text-white shadow-rose-600/30',
  [EventType.ANNIVERSAIRE]: 'bg-purple-500 text-white shadow-purple-500/30'
};

export const TYPE_ICONS: Record<EventType, string> = {
  [EventType.JOURNEE]: '☀️',
  [EventType.SOIREE]: '🌙',
  [EventType.WEEKEND]: '📅',
  [EventType.VACANCES]: '🏖️',
  [EventType.ACTIVITE]: '🏃',
  [EventType.ANNIVERSAIRE]: '🎂'
};