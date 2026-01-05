
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  // Règle d'or : On initialise l'instance juste avant l'appel pour avoir la clé la plus récente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const basePrompt = userProvidedName 
    ? `L'utilisateur veut organiser un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement créative et originale pour le mois de ${month} de type "${type}".`;

  const prompt = `${basePrompt} 
    Propose : Un titre, une date précise en ${month}, une description courte (150 car. max) et un émoji.
    IMPORTANT : Le nombre de participants (maxParticipants) doit TOUJOURS être fixé à 4.
    Réponds uniquement en JSON valide.`;

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
    const errorMsg = error?.message?.toLowerCase() || "";
    console.error("Gemini Critical Error:", error);
    
    // Détection des erreurs de clé sur Vercel/AI Studio
    if (
      errorMsg.includes("not found") || 
      errorMsg.includes("invalid") ||
      errorMsg.includes("401") ||
      errorMsg.includes("403")
    ) {
        throw new Error("KEY_NOT_FOUND");
    }

    // Détection spécifique de la facturation (très fréquent sur Gemini 3)
    if (errorMsg.includes("billing") || errorMsg.includes("pay-as-you-go")) {
        throw new Error("BILLING_REQUIRED");
    }

    let userMsg = "Erreur technique IA.";
    if (errorMsg.includes("429")) userMsg = "Quota dépassé (Trop de demandes).";
    
    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Courant ${month}`,
      description: `Note : ${userMsg}`,
      icon: "⚠️",
      maxParticipants: 4,
      isAiGenerated: false
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    // Seul Gemini 2.5 supporte googleMaps grounding
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Propose un lieu précis pour "${eventTitle}" en ${month}.`,
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
    console.warn("Maps grounding failed, using default.");
  }
  return { name: "Lieu à définir" };
};
