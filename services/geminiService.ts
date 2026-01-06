
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

/**
 * Service de génération d'idées d'événements via Gemini 3 Flash.
 * Utilise strictement process.env.API_KEY.
 */
export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  // Initialisation conforme aux guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const basePrompt = userProvidedName 
    ? `Organise un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement inédite et excitante pour le mois de ${month} (${type}).`;

  const instructions = `${basePrompt} 
    Détails requis en français : 
    - Titre accrocheur et court.
    - Date logique au format "JOUR MOIS" (ex: "15 ${month}").
    - Description immersive et chaleureuse (140 car. max).
    - Un emoji thématique pertinent.
    - Nombre de participants maximum (entre 3 et 10).
    Réponds exclusivement au format JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: instructions,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            icon: { type: Type.STRING },
            maxParticipants: { type: Type.INTEGER }
          },
          required: ["title", "date", "description", "icon", "maxParticipants"],
        },
      },
    });

    // Accès direct à .text (propriété, pas méthode)
    const text = response.text;
    if (!text) throw new Error("Réponse de l'IA vide.");

    const data = JSON.parse(text);
    return { 
      ...data, 
      maxParticipants: data.maxParticipants || 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Suggère un lieu pertinent basé sur le titre de l'événement.
 */
export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggère un lieu réel (nom et ville) pour l'événement "${eventTitle}" en ${month}. Réponds uniquement le nom du lieu et la ville.`,
    });

    const locationName = response.text?.trim() || "Lieu à définir";
    
    return { 
      name: locationName, 
      mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}` 
    };
  } catch (e) {
    return { name: "Lieu à définir" };
  }
};
