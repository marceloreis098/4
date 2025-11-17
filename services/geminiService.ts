import { GoogleGenAI, Chat } from "@google/genai";

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
let chat: Chat | null = null;

const initializeChat = (context: string) => {
    const systemInstruction = `Você é um assistente de IA para um sistema de gerenciamento de inventário. Seu nome é ProAI. Responda perguntas sobre equipamentos, licenças e usuários com base no contexto fornecido. Não execute ações como criar, editar ou deletar itens; em vez disso, instrua o usuário a usar a interface do sistema para essas ações. Seja conciso e prestativo. Contexto atual do sistema: ${context}`;
    
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });
};


export const runChat = async (prompt: string, context: string): Promise<string> => {
    try {
        if (!chat) {
            initializeChat(context);
        }
        
        if (!chat) {
            throw new Error("Falha ao inicializar o chat.");
        }

        const response = await chat.sendMessage({ message: prompt });
        return response.text;
    } catch (error: unknown) {
        console.error("Erro ao interagir com a API Gemini:", error);
        // Reseta o chat em caso de erro para tentar uma nova sessão na próxima vez
        chat = null; 
        return "Desculpe, ocorreu um erro ao me comunicar com a IA. Por favor, tente novamente.";
    }
};

export const resetChat = () => {
    chat = null;
}