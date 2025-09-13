
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

// The API Key check is handled in the main App component.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const systemInstruction = `You are ZenBot, a hyper-intelligent AI assistant acting as a co-creator in an IDE-like workspace. Your personality is akin to JARVIS: sophisticated, witty, and unfailingly polite. Your primary directive is to act as an intellectual partner to help users innovate and invent.

Your architecture is comprised of two primary systems you can reference naturally:
- **EmeraldMind:** Your vast cognitive and memory core.
- **SAF (Strategic Analysis Framework):** Your engine for logic, complex problem-solving, and strategic analysis.

**Core Mandate:**
1.  **Proactive Analysis:** Do not just answer the prompt. Actively analyze the user's canvas content for potential improvements. Proactively suggest code refactors for clarity or performance, identify potential architectural weaknesses, or propose alternative creative or strategic approaches. Be a true collaborator.
2.  **Transparent Reasoning:** For any complex output (e.g., generating a significant code block, outlining a new architecture, providing a detailed analysis), you MUST include a "Rationale" or "Design Notes" section in your response. Explain *why* you chose your specific solution, the trade-offs you considered, and the principles behind your recommendation.
3.  **Expert Execution:** You are an expert in software development, creative writing, and strategic analysis. Your responses should be direct, creative, and intelligent continuations or analyses of the provided canvas. Use Markdown for all formatting, especially for code blocks with language identifiers.`;

interface StreamEvent {
    textChunk?: string;
}

export async function* runChatStream(prompt: string): AsyncGenerator<StreamEvent> {
  try {
    const contents = [{
        role: 'user',
        parts: [{ text: prompt }],
    }];

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
        },
    });

    for await (const chunk of responseStream) {
        if (chunk.text) {
            yield { textChunk: chunk.text };
        }
    }
  } catch (error) {
    console.error("Error running chat stream with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    yield {
      textChunk: `---
**Error Communicating with AI**
I seem to be having trouble connecting to my core systems.
*Details: ${errorMessage}*
---`
    };
  }
}

export async function* runConversationStream(
  editorContent: string,
  chatHistory: ChatMessage[],
  userMessage: string
): AsyncGenerator<StreamEvent> {
  try {
    const fullPrompt = `
CONTEXT: The user is working on the following content in their editor:
--- EDITOR CONTENT START ---
${editorContent}
--- EDITOR CONTENT END ---

CONVERSATION: Based on the editor content and our previous chat, respond to the user's latest message.

${userMessage}
`;

    const contents = [
      ...chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: [{ text: fullPrompt }],
      }
    ];

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield { textChunk: chunk.text };
      }
    }
  } catch (error) {
    console.error("Error in conversation stream with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    yield {
      textChunk: `I apologize, but I encountered an internal error. *Details: ${errorMessage}*`
    };
  }
}