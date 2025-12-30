import { GoogleGenAI, Type } from "@google/genai";
import { EventType, GeminiEventResponse, EventLocation } from "../types";

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
    ? `IMPORTANT : Ne choisis PAS un émoji parmi la liste suivante car ils sont déjà utilisés : ${usedIcons.join(', ')}.`
    : '';

  const prompt = `${basePrompt} 
    Propose une date précise (ex: 12 ${month}), une description attrayante de 2 phrases maximum, un émoji unique qui illustre parfaitement cet événement spécifique, et un nombre maximum de participants recommandé. 
    IMPORTANT: Utilise systématiquement 4 comme nombre de participants par défaut.
    ${exclusionPrompt}
    L'émoji doit être différent de ceux déjà utilisés.
    Si un nom est déjà fourni, garde-le ou améliore-le très légèrement pour le rendre plus festif.
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
            title: {
              type: Type.STRING,
              description: "Le nom de l'événement",
            },
            date: {
              type: Type.STRING,
              description: "La date exacte (ex: 15 Mars)",
            },
            description: {
              type: Type.STRING,
              description: "Une courte description accrocheuse",
            },
            icon: {
              type: Type.STRING,
              description: "Un seul émoji qui représente l'activité",
            },
            maxParticipants: {
              type: Type.INTEGER,
              description: "Nombre maximum de participants (doit être 4 par défaut)",
            }
          },
          required: ["title", "date", "description", "icon", "maxParticipants"],
        },
      },
    });

    const result = JSON.parse(response.text.trim());
    
    if (usedIcons.includes(result.icon)) {
      const backupIcons = ['✨', '🌟', '🔥', '🎈', '🎉', '🎊', '🎀', '🎁', '🎨', '🎭', '🎪', '🎡', '🎢', '🎠'];
      result.icon = backupIcons.find(i => !usedIcons.includes(i)) || '📅';
    }

    return result;
  } catch (error) {
    console.error("Gemini API error:", error);
    
    const pool: Record<EventType, string[]> = {
      [EventType.JOURNEE]: ['☀️', '🏙️', '🍎', '🥪', '🚶', '🏸', '📷'],
      [EventType.SOIREE]: ['🌙', '🍷', '🍸', '🍻', '🥂', '💃', '🕺', '🎸', '🎵'],
      [EventType.WEEKEND]: ['📅', '🚗', '⛺', '🚵', '🛶', '🎒', '🥪'],
      [EventType.VACANCES]: ['🏖️', '✈️', '🚢', '🌴', '🕶️', 'COCO', '🍦', '🌍'],
      [EventType.ACTIVITE]: ['🏃', '🎾', '🏀', '⚽', '🎨', '♟️', '🎮', '🧩'],
      [EventType.ANNIVERSAIRE]: ['🎂', '🍰', '🧁', '🎁', '🎈', '🎉', '🥳', '🍰']
    };

    const typePool = pool[type] || ['✨'];
    const availableIcon = typePool.find(icon => !usedIcons.includes(icon)) || '✨';

    return {
      title: userProvidedName || `${type} de ${month}`,
      date: `Samedi 15 ${month}`,
      description: "Un moment convivial à ne pas manquer !",
      icon: availableIcon,
      maxParticipants: 4
    };
  }
};

export const suggestLocation = async (eventTitle: string, month: string): Promise<EventLocation | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Propose un lieu réel et emblématique (adresse ou nom d'établissement) pour un événement intitulé "${eventTitle}" en ${month}. Sois précis sur le lieu.`,
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
    return undefined;
  }
};