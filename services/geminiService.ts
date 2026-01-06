
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

/**
 * Génère une idée d'événement personnalisée via Gemini.
 * Nécessite la variable d'environnement API_KEY.
 */
export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  // Initialisation avec la clé d'environnement
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = userProvidedName 
    ? `Organise un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement inédite et excitante pour le mois de ${month} (${type}).`;

  const instructions = `${prompt}
    Détails requis en français :
    - Titre accrocheur.
    - Date logique (ex: "12 ${month}").
    - Description immersive (140 car. max).
    - Un emoji thématique.
    - Participants max (entre 3 et 12).
    Réponds exclusivement en JSON.`;

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

    // Utilisation de la propriété .text (et non la méthode .text())
    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");
    
    const data = JSON.parse(text);
    return { 
      ...data, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

/**
 * Suggère un lieu réel adapté à l'événement.
 */
export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggère un lieu réel et sa ville pour l'événement "${eventTitle}" en ${month}. Réponds uniquement: Nom du lieu, Ville.`,
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
