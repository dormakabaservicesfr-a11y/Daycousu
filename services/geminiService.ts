
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("KEY_NOT_FOUND");

  // Création d'une nouvelle instance à chaque appel comme recommandé
  const ai = new GoogleGenAI({ apiKey });
  
  const basePrompt = userProvidedName 
    ? `Organise un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement inédite et excitante pour ${month} (${type}).`;

  const prompt = `${basePrompt} 
    Détails requis : Titre accrocheur, date logique en ${month}, description immersive (140 car. max), un emoji thématique.
    Participants max : 4.
    Réponds exclusivement en JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        // Activation du mode réflexion pour une meilleure créativité
        thinkingConfig: { thinkingBudget: 2000 },
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
      maxParticipants: 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (errorMsg.includes("API key") || errorMsg.includes("invalid") || errorMsg.includes("401")) {
      throw new Error("KEY_NOT_FOUND");
    }
    if (errorMsg.includes("quota") || errorMsg.includes("429")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw error;
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return { name: "Lieu à définir" };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `Suggère un lieu réel et approprié pour "${eventTitle}" en ${month}.`,
      config: { tools: [{ googleMaps: {} }] },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsChunk = chunks?.find(chunk => chunk.maps);
    
    return mapsChunk?.maps 
      ? { name: mapsChunk.maps.title, mapsUri: mapsChunk.maps.uri }
      : { name: "Lieu à définir" };
  } catch (e) {
    return { name: "Lieu à définir" };
  }
};
