
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  // Récupération de la clé depuis l'environnement injecté
  const apiKey = process.env.API_KEY;
  
  // Vérification critique avant initialisation
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("KEY_NOT_FOUND");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const basePrompt = userProvidedName 
    ? `L'utilisateur veut organiser un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement créative et originale pour le mois de ${month} de type "${type}".`;

  const prompt = `${basePrompt} 
    Propose : Un titre, une date précise en ${month}, une description courte (150 car. max) et un émoji.
    Le nombre de participants (maxParticipants) doit être fixé à 4.
    Réponds en JSON uniquement.`;

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

    const text = response.text;
    if (!text) throw new Error("EMPTY_RESPONSE");

    const data = JSON.parse(text);
    return { 
      ...data, 
      maxParticipants: 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    const errorMsg = error?.message || "Unknown error";
    console.error("Gemini Critical Error:", error);
    
    if (errorMsg.includes("Requested entity was not found")) {
      throw new Error("RESET_KEY");
    }
    if (errorMsg.includes("401") || errorMsg.includes("403") || errorMsg.includes("API key")) {
      throw new Error("KEY_NOT_FOUND");
    }
    if (errorMsg.toLowerCase().includes("billing") || errorMsg.toLowerCase().includes("pay-as-you-go")) {
      throw new Error("BILLING_REQUIRED");
    }
    
    throw new Error(errorMsg);
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return { name: "Lieu à définir" };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggère un lieu précis pour l'événement "${eventTitle}" en ${month}.`,
      config: { tools: [{ googleMaps: {} }] },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsChunk = chunks?.find(chunk => chunk.maps);
    
    if (mapsChunk?.maps) {
      return { 
        name: mapsChunk.maps.title, 
        mapsUri: mapsChunk.maps.uri 
      };
    }
  } catch (e) {
    console.warn("Location fetch failed");
  }
  return { name: "Lieu à définir" };
};
