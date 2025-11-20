import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

export const geminiService = {
  generateImage: async (prompt: string): Promise<string> => {
    try {
      // Using imagen-4.0-generate-001 for high quality image generation
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });
      
      if (response.generatedImages && response.generatedImages.length > 0) {
         const base64ImageBytes = response.generatedImages[0].image.imageBytes;
         return `data:image/jpeg;base64,${base64ImageBytes}`;
      }
      throw new Error("No image generated");
    } catch (error) {
      console.error("Error generating image:", error);
      // Fallback to simulated image via Picsum if API fails or key is invalid (for demo reliability)
      return `https://picsum.photos/800/600?random=${Date.now()}`;
    }
  },

  generateCaption: async (base64Image: string): Promise<string> => {
    try {
        // Remove data URL prefix if present
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: 'image/jpeg', // Assuming jpeg for simplicity in this demo
                        },
                    },
                    {
                        text: 'Generate a creative and engaging caption for this image suitable for social media.',
                    },
                ],
            },
        });
        return response.text || "Could not generate caption.";
    } catch (error) {
        console.error("Error generating caption:", error);
        return "An error occurred while generating the caption.";
    }
  },
  
  editImage: async (base64Image: string, instructions: string): Promise<string> => {
      // Using gemini-2.5-flash-image for image editing/modification tasks
      try {
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: 'image/jpeg', 
                        },
                    },
                    {
                        text: `Edit this image: ${instructions}`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Extract image from response parts
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image returned from edit.");
      } catch (error) {
          console.error("Error editing image", error);
          return base64Image; // Return original if fail
      }
  },

  chat: async (message: string, history: {role: 'user' | 'model', parts: [{text: string}]}[] = []): Promise<string> => {
    try {
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
            systemInstruction: "You are a helpful and friendly community assistant for the Community Nexus app."
        }
      });
      
      const result = await chat.sendMessage({ message });
      return result.text || "I'm sorry, I didn't understand that.";
    } catch (error) {
      console.error("Chat error:", error);
      return "Sorry, I am having trouble connecting to the AI service right now.";
    }
  },

  validateContent: async (text: string): Promise<{isSafe: boolean, reason?: string}> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following comment for toxicity, hate speech, or inappropriate content. 
            Comment: "${text}"
            Respond with JSON only: {"isSafe": boolean, "reason": string (optional, keep it brief)}`,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        const result = JSON.parse(response.text || '{}');
        return { isSafe: result.isSafe ?? true, reason: result.reason };
    } catch (error) {
        console.error("Safety check failed", error);
        // Fail open but log error
        return { isSafe: true };
    }
  }
};