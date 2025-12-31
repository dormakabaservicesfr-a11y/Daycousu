
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string,
  usedIcons: string[] = []
): Promise<GeminiEventResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const basePrompt = userProvidedName 
    ? `L'utilisateur veut organiser un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement créative pour le mois de ${month} de type "${type}".`;

  const exclusionPrompt = usedIcons.length > 0 
    ? `IMPORTANT : Ne choisis PAS un émoji parmi la liste suivante : ${usedIcons.join(', ')}.`
    : '';

  const prompt = `${basePrompt} 
    Propose une date précise, une description attrayante (2 phrases max), un émoji unique, et un nombre de participants (4 par défaut). 
    ${exclusionPrompt}
    Réponds uniquement au format JSON pur sans balises Markdown.`;

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

    // Nettoyage de la réponse pour extraire le JSON valide
    const text = response.text || "{}";
    const cleanedJson = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleanedJson);
    
    return result;
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `15 ${month}`,
      description: "Un moment convivial à ne pas manquer !",
      icon: "✨",
      maxParticipants: 4
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Propose un lieu emblématique pour "${eventTitle}" en ${month}.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsChunk = groundingChunks?.find(chunk => chunk.maps);

    if (mapsChunk) {
      return {
        name: mapsChunk.maps.title || "Lieu suggéré",
        mapsUri: mapsChunk.maps.uri
      };
    }
    
    return { name: "Lieu à définir" };
  } catch (error) {
    console.error("Location suggestion error:", error);
    return { name: "Lieu à définir" };
  }
};
