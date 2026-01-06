
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

/**
 * Service de génération d'idées d'événements via Gemini 3 Flash.
 * Utilise exclusivement process.env.API_KEY configurée dans l'environnement.
 */
export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const basePrompt = userProvidedName 
    ? `Organise un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement inédite et excitante pour ${month} (${type}).`;

  const prompt = `${basePrompt} 
    Détails requis en français : 
    - Titre accrocheur et court.
    - Date logique au format "JOUR MOIS" (ex: "15 ${month}").
    - Description immersive et chaleureuse (140 car. max).
    - Un emoji thématique pertinent.
    - Participants maximum (entre 2 et 10).
    Réponds exclusivement en JSON valide.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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

    const data = JSON.parse(response.text || "{}");
    return { 
      ...data, 
      maxParticipants: data.maxParticipants || 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    console.error("Erreur Gemini API:", error);
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
      contents: `Suggère un lieu réel (et sa ville) pour l'événement "${eventTitle}" en ${month}. Réponds uniquement le nom du lieu et la ville, rien d'autre.`,
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
