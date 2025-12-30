export enum EventType {
  JOURNEE = 'Journée',
  SOIREE = 'Soirée',
  WEEKEND = 'Week-end',
  VACANCES = 'Vacances',
  ACTIVITE = 'Activité',
  ANNIVERSAIRE = 'Anniversaire'
}

export interface EventLocation {
  name: string;
  address?: string;
  mapsUri?: string;
}

export interface EventData {
  id: string;
  title: string;
  date: string;
  description: string;
  icon: string;
  type: EventType;
  month: string;
  attendees: string[];
  maxParticipants: number;
  location?: EventLocation;
}

export interface GeminiEventResponse {
  title: string;
  date: string;
  description: string;
  icon: string;
  maxParticipants: number;
}