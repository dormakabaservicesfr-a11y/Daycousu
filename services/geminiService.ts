
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string
): Promise<GeminiEventResponse> => {
  // Fix: Initialize GoogleGenAI with process.env.API_KEY as a named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const basePrompt = userProvidedName 
    ? `Organise un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement inédite et excitante pour ${month} (${type}).`;

  const prompt = `${basePrompt} 
    Détails requis : 
    - Titre accrocheur.
    - Date logique strictement au format "CHIFFRE MOIS" (ex: "21 ${month}"). Ne pas ajouter de mots comme "Le".
    - Description immersive (140 car. max).
    - Un emoji thématique.
    Participants max : 4.
    Réponds exclusivement en JSON.`;

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

    // Fix: Access response.text directly (it is a property, not a method)
    const data = JSON.parse(response.text || "{}");
    return { 
      ...data, 
      maxParticipants: data.maxParticipants || 4, 
      isAiGenerated: true 
    };
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    if (error.message?.includes("API key") || error.status === 401) {
      throw new Error("KEY_NOT_FOUND");
    }
    throw error;
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  try {
    // Fix: Initialize GoogleGenAI with process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggère un lieu réel et approprié pour l'événement "${eventTitle}" qui a lieu en ${month}. Réponds juste le nom du lieu et la ville.`,
    });

    // Fix: Access response.text directly
    const locationName = response.text?.trim() || "Lieu à définir";
    
    return { 
      name: locationName, 
      mapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}` 
    };
  } catch (e) {
    return { name: "Lieu à définir" };
  }
};
