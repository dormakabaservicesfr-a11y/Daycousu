
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  // CRITICAL: Create instance right before call for Gemini 3 / AI Studio
  const apiKey = process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });
  
  const basePrompt = userProvidedName 
    ? `L'utilisateur veut organiser un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement créative et originale pour le mois de ${month} de type "${type}".`;

  const prompt = `${basePrompt} 
    Propose : Un titre, une date précise en ${month}, une description courte (150 car. max) et un émoji.
    IMPORTANT : Le nombre de participants (maxParticipants) doit TOUJOURS être fixé à 4.
    Réponds uniquement en JSON.`;

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
    const errorMsg = error?.message || "";
    console.error("Gemini Error:", error);
    
    // Détection spécifique demandée par les guidelines
    if (errorMsg.includes("Requested entity was not found")) {
      throw new Error("RESET_KEY");
    }

    if (errorMsg.includes("401") || errorMsg.includes("403") || errorMsg.includes("API key not found")) {
      throw new Error("KEY_NOT_FOUND");
    }

    if (errorMsg.toLowerCase().includes("billing")) {
      throw new Error("BILLING_REQUIRED");
    }

    // Fallback gracieux pour les erreurs de quota ou autres
    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Courant ${month}`,
      description: `Note: L'IA est momentanément indisponible (Quota ou Facturation).`,
      icon: "⚠️",
      maxParticipants: 4,
      isAiGenerated: false
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    // Google Maps grounding supporté uniquement sur la série 2.5 pour le moment
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où organiser "${eventTitle}" en ${month} ? Sois très spécifique.`,
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
    console.warn("Location grounding skipped");
  }
  return { name: "Lieu à définir" };
};
