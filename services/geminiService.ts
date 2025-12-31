
import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types.ts";

export const generateEventIdeas = async (
  month: string, 
  type: EventType, 
  userProvidedName?: string,
  usedIcons: string[] = []
): Promise<GeminiEventResponse> => {
  // On utilise directement la clé de l'environnement
  const apiKey = process.env.API_KEY;
  
  // Si vraiment aucune clé n'est présente, on garde un fallback discret mais fonctionnel
  if (!apiKey) {
    console.error("ERREUR : La variable d'environnement API_KEY est introuvable. Vérifiez vos paramètres Vercel.");
    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Le 15 ${month}`,
      description: "L'IA est prête mais la clé API n'est pas détectée sur Vercel. Vérifiez vos variables d'environnement.",
      icon: "⚙️",
      maxParticipants: 4
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const basePrompt = userProvidedName 
    ? `L'utilisateur veut organiser un événement nommé "${userProvidedName}" pour le mois de ${month} de type "${type}".`
    : `Génère une idée d'événement créative et originale pour le mois de ${month} de type "${type}".`;

  const exclusionPrompt = usedIcons.length > 0 
    ? `IMPORTANT : Ne choisis PAS un émoji parmi ceux-ci : ${usedIcons.join(', ')}.`
    : '';

  const prompt = `${basePrompt} 
    Propose :
    1. Un titre accrocheur.
    2. Une date précise (ex: "Samedi 14 ${month}").
    3. Une description très courte et fun (max 150 caractères).
    4. Un émoji unique en rapport direct avec l'activité.
    5. Un nombre maximum de participants logique.
    ${exclusionPrompt}
    Réponds uniquement au format JSON.`;

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

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Erreur lors de l'appel Gemini:", error);
    
    // Si l'erreur est liée à une clé invalide ou manquante
    const errorMessage = error?.message?.includes("API key not found") 
      ? "Clé API non trouvée. Vérifiez Vercel." 
      : "Gemini est temporairement indisponible.";

    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Courant ${month}`,
      description: errorMessage,
      icon: "📅",
      maxParticipants: 4
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return { name: "Lieu à définir" };

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Où pourrait-on organiser l'événement "${eventTitle}" en ${month} ? Sois précis.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsChunk = chunks?.find(chunk => chunk.maps);

    if (mapsChunk) {
      return {
        name: mapsChunk.maps.title || "Lieu suggéré",
        mapsUri: mapsChunk.maps.uri
      };
    }
  } catch (error) {
    console.warn("Erreur suggestion lieu:", error);
  }
  return { name: "Lieu à définir" };
};
