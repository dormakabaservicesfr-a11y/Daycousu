
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types";

/**
 * Service de génération d'événements utilisant Gemini 3 Flash.
 */
export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const basePrompt = userProvidedName 
    ? `Organise un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement inédite et excitante pour ${month} (${type}).`;

  const prompt = `${basePrompt} 
    Détails requis en français : 
    - Titre accrocheur (court)
    - Date logique au format "JOUR MOIS" (ex: "14 ${month}")
    - Description immersive (140 car. max)
    - Un emoji thématique pertinent.
    - Participants maximum : Fixe impérativement à 4.
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

    const textOutput = response.text;
    if (!textOutput) throw new Error("EMPTY_RESPONSE");

    const data = JSON.parse(textOutput);
    // On force 4 même si le modèle renvoie autre chose
    return { 
      ...data, 
      maxParticipants: 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

/**
 * Suggère un lieu pertinent basé sur le titre.
 */
export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return { name: "Lieu à définir" };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggère un lieu réel (et sa ville) pour l'événement "${eventTitle}" en ${month}. Réponds juste : Nom du lieu, Ville.`,
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
