
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string,
  usedIcons: string[] = []
): Promise<GeminiEventResponse> => {
  // On récupère la clé au moment de l'appel pour s'assurer d'avoir la plus récente
  const apiKey = process.env.API_KEY;
  
  // Initialisation de l'IA (le SDK gérera l'absence de clé si elle n'est pas injectée par la plateforme)
  const ai = new GoogleGenAI({ apiKey: apiKey || '' });
  
  const basePrompt = userProvidedName 
    ? `L'utilisateur veut organiser un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement créative et originale pour le mois de ${month} de type "${type}".`;

  const prompt = `${basePrompt} 
    Propose : Un titre, une date précise en ${month}, une description courte (150 car. max) et un émoji.
    IMPORTANT : Le nombre de participants (maxParticipants) doit TOUJOURS être fixé à 4.
    Réponds UNIQUEMENT en JSON.`;

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
      maxParticipants: 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    console.error("Détail erreur Gemini:", error);
    
    // Si l'erreur indique que la clé est manquante ou invalide dans cet environnement
    if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("API key not found")) {
        throw new Error("KEY_NOT_FOUND");
    }

    let msg = "Erreur technique IA.";
    if (error?.message?.includes("401")) msg = "Clé API invalide ou expirée.";
    if (error?.message?.includes("429")) msg = "Quota dépassé (trop de requêtes).";
    
    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Courant ${month}`,
      description: `Fallback: ${msg}`,
      icon: "⚠️",
      maxParticipants: 4,
      isAiGenerated: false
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  const apiKey = process.env.API_KEY;
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || '' });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où organiser "${eventTitle}" en ${month} ?`,
      config: { tools: [{ googleMaps: {} }] },
    });
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsChunk = chunks?.find(chunk => chunk.maps);
    if (mapsChunk) return { name: mapsChunk.maps.title, mapsUri: mapsChunk.maps.uri };
  } catch (e) { /* ignore silent */ }
  return { name: "Lieu à définir" };
};
