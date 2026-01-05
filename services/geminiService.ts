
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

/**
 * Crée une instance fraîche de l'IA avec la clé actuelle de l'environnement.
 * Les règles imposent de créer l'instance juste avant l'appel.
 */
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  const ai = getAiInstance();
  
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
    const errorMsg = error?.message || "";
    console.error("Gemini Error Details:", error);
    
    // Cas où la clé est manquante ou invalide dans l'environnement Vercel / AI Studio
    if (
      errorMsg.includes("Requested entity was not found") || 
      errorMsg.includes("API key not found") ||
      errorMsg.includes("401") ||
      errorMsg.includes("403")
    ) {
        throw new Error("KEY_NOT_FOUND");
    }

    // Autres erreurs (Quota, Modèle, etc.)
    let userMsg = "Erreur technique IA.";
    if (errorMsg.includes("429")) userMsg = "Quota dépassé (Passez au plan payant).";
    if (errorMsg.includes("billing")) userMsg = "Facturation requise sur Google Cloud.";
    
    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Courant ${month}`,
      description: `Note: ${userMsg}`,
      icon: "⚠️",
      maxParticipants: 4,
      isAiGenerated: false
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    const ai = getAiInstance();
    // Maps grounding nécessite gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où organiser "${eventTitle}" en ${month} ? Sois précis.`,
      config: { 
        tools: [{ googleMaps: {} }] 
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsChunk = chunks?.find(chunk => chunk.maps);
    
    if (mapsChunk && mapsChunk.maps) {
      return { 
        name: mapsChunk.maps.title, 
        mapsUri: mapsChunk.maps.uri 
      };
    }
  } catch (e) {
    console.error("Grounding error:", e);
  }
  return { name: "Lieu à définir" };
};
