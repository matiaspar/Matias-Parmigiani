import { GoogleGenAI, Type } from "@google/genai";
import type { ChatMessage, Mystery } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const mysterySchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "El título del misterio." },
    initialScene: { type: Type.STRING, description: "El texto narrativo inicial que establece la escena del crimen." },
    initialImagePrompt: { type: Type.STRING, description: "Un prompt detallado para un generador de imágenes, estilo noir y fotorrealista, describiendo la escena inicial. El prompt debe ser descriptivo pero evitar lenguaje que pueda ser interpretado como gráfico o violento (ej. en lugar de 'cuerpo ensangrentado', usar 'figura inmóvil en el suelo')." },
    secretSolution: { type: Type.STRING, description: "La solución secreta y detallada del misterio: quién fue, cómo y por qué." },
  }
};

const gameStepSchema = {
    type: Type.OBJECT,
    properties: {
        narration: { type: Type.STRING, description: "La continuación de la historia basada en la acción del jugador. Debe ser solo la narración pura, sin meta-comentarios." },
        imagePrompt: { type: Type.STRING, description: "Un nuevo prompt de imagen que refleja la narración. El prompt debe ser descriptivo pero evitar lenguaje que pueda ser interpretado como gráfico o violento (ej. en lugar de 'cuchillo en el pecho', usar 'un objeto metálico sobre la camisa')." },
        newClue: { type: Type.STRING, description: "Una pista clave que el jugador descubrió, si la hay. Si no hay una nueva pista específica, este campo debe ser una cadena vacía." },
    }
};

const solutionCheckSchema = {
    type: Type.OBJECT,
    properties: {
        isCorrect: { type: Type.BOOLEAN, description: "Verdadero si la solución del jugador es correcta, falso en caso contrario." },
        explanation: { type: Type.STRING, description: "Una explicación detallada de por qué la solución es correcta o incorrecta." },
    }
};

export const generateNewMystery = async (language: string): Promise<Mystery> => {
  const prompt = `Actúa como un maestro escritor de misterios al estilo de Agatha Christie. Crea un completo misterio de asesinato ambientado en el Concejo Deliberante de la ciudad de Córdoba, Argentina, en el año 2025.
Para la creación de personajes ficticios y para dar consistencia a la narración, utiliza como referencia la estructura, roles y comisiones que se encuentran en el sitio web oficial www.cdcordoba.gob.ar.
La víctima es un concejal influyente y polémico. El escenario y TODAS las locaciones mencionadas deben estar estrictamente dentro del NUEVO edificio del Concejo Deliberante de la ciudad de Córdoba, ubicado en Av. Gdor. Amadeo Sabattini 4700. No utilices el antiguo edificio (Palacio 6 de Julio). No introduzcas ninguna ubicación externa. Los personajes deben ser ficticios pero realistas para ese entorno, inspirados en los roles que encontrarías en el concejo real.
Debes proporcionar:
1.  Un título intrigante.
2.  Una escena inicial detallada que describe el descubrimiento del cuerpo y el entorno.
3.  Un prompt para un generador de imágenes que capture la atmósfera de la escena inicial con un estilo cinematográfico y noir.
4.  Una solución secreta detallada que explique quién es el asesino, su motivo, el método y cómo se pueden interpretar las pistas.
La respuesta DEBE estar en el idioma: ${language}.
IMPORTANTE: NO incluyas nombres de políticos o personalidades reales. Utiliza nombres y personalidades completamente ficticias, aunque sus roles y funciones se basen en la información del sitio web de referencia.
Tu respuesta debe ser únicamente el objeto JSON, sin ningún texto adicional, explicaciones o formato markdown.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: mysterySchema,
      temperature: 1.0,
    }
  });
  
  const text = response.text.trim();
  return JSON.parse(text) as Mystery;
};

export const generateImage = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `${prompt}, photorealistic, cinematic lighting, noir style, high detail`,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });
    
    if (!response.generatedImages || response.generatedImages.length === 0 || !response.generatedImages[0].image) {
        console.error("Image generation failed. Full API response:", JSON.stringify(response, null, 2));
        throw new Error("No se pudo generar la imagen para la escena. La respuesta de la API no contenía imágenes. Esto puede deberse a filtros de seguridad. Intenta con una acción diferente.");
    }

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const getNextStep = async (chatHistory: ChatMessage[], playerInput: string, language: string): Promise<{ narration: string; imagePrompt: string; newClue: string }> => {
    const historyText = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
    const prompt = `Eres el Game Master de un juego de misterio. El jugador es un detective. La historia hasta ahora es:\n${historyText}\n\nLa última acción del jugador es: "${playerInput}".

Basado en la acción del jugador, genera la siguiente parte de la historia. La narración debe ser puramente descriptiva y en el idioma del jugador (${language}). NO incluyas la acción del jugador en tu respuesta. NO incluyas meta-comentarios. Solo proporciona la narración, un nuevo prompt de imagen y una posible nueva pista. Tu respuesta debe ser únicamente el objeto JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: gameStepSchema,
        }
    });

    const text = response.text.trim();
    return JSON.parse(text);
};

export const checkSolution = async (chatHistory: ChatMessage[], proposedSolution: string, secretSolution: string, language: string): Promise<{ isCorrect: boolean; explanation: string }> => {
    const historyText = chatHistory.map(m => `${m.role}: ${m.text}`).join('\n');
    const prompt = `Eres el Game Master. El jugador ha propuesto una solución al misterio.
    
    La solución secreta es: "${secretSolution}"

    La solución propuesta por el jugador es: "${proposedSolution}"

    Analiza si la propuesta del jugador es correcta. Compara su razonamiento con la solución secreta. Tu respuesta debe estar en el idioma: ${language}.
    Tu respuesta debe ser únicamente el objeto JSON.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: solutionCheckSchema,
        }
    });
    
    const text = response.text.trim();
    return JSON.parse(text);
};