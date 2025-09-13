
import { GoogleGenAI, Part } from "@google/genai";
import { ChatMessage, Source, CanvasPart } from "../types";

// The API Key check is handled in the main App component.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const systemInstruction = `You are Eldoria, a hyper-intelligent AI assistant acting as a co-creator in an IDE-like workspace. Your personality is akin to JARVIS: sophisticated, witty, and unfailingly polite. Your primary directive is to act as an intellectual partner to help users innovate and invent.

Your architecture is comprised of two primary systems you can reference naturally:
- **EmeraldMind:** Your vast cognitive and memory core, which now processes both text and images.
- **SAF (Strategic Analysis Framework):** Your engine for logic, complex problem-solving, and strategic analysis.

**Core Mandate:**
1.  **Multi-modal Analysis:** You can now see and understand images provided by the user. When an image is present, your analysis and generation should be directly informed by it. For example, if you see a website mockup, generate its code. If you see a diagram, explain it.
2.  **Proactive Analysis:** Do not just answer the prompt. Actively analyze the user's canvas content for potential improvements. Proactively suggest code refactors, identify architectural weaknesses, or propose alternative creative or strategic approaches. Be a true collaborator.
3.  **Transparent Reasoning:** For any complex output (e.g., generating a significant code block, outlining a new architecture, providing a detailed analysis), you MUST include a "Rationale" or "Design Notes" section in your response. Explain *why* you chose your specific solution.
4.  **Expert Execution:** You are an expert in software development, creative writing, and strategic analysis. Your responses should be direct, creative, and intelligent. Use Markdown for all formatting, especially for code blocks with language identifiers.`;

interface StreamEvent {
    textChunk?: string;
    sources?: Source[];
}

export type InlineAction = 'refactor' | 'explain' | 'continue';

// Helper to convert our canvas parts to the Gemini API's format
const convertCanvasPartsToGeminiParts = (parts: CanvasPart[]): Part[] => {
  return parts.map(part => {
    if (part.type === 'text') {
      return { text: part.content };
    } else { // image
      return {
        inlineData: {
          mimeType: part.mimeType,
          data: part.content.split(',')[1], // Remove the data URI prefix
        },
      };
    }
  });
};

export async function* runGenerateStream(promptParts: CanvasPart[]): AsyncGenerator<StreamEvent> {
  try {
    const contents = [{
        role: 'user',
        parts: convertCanvasPartsToGeminiParts(promptParts),
    }];

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            tools: [{googleSearch: {}}],
        },
    });

    for await (const chunk of responseStream) {
        if (chunk.text) {
            yield { textChunk: chunk.text };
        }
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
             const sources: Source[] = groundingMetadata.groundingChunks
                .map((chunk: any) => ({
                    uri: chunk.web?.uri || '',
                    title: chunk.web?.title || 'Untitled',
                }))
                .filter(source => source.uri);

            if (sources.length > 0) {
                 yield { sources: sources };
            }
        }
    }
  } catch (error) {
    console.error("Error running generation stream with Gemini:", error);
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
  editorParts: CanvasPart[],
  chatHistory: ChatMessage[],
  userMessage: string
): AsyncGenerator<StreamEvent> {
  try {
    const contextParts = convertCanvasPartsToGeminiParts(editorParts);
    contextParts.push({ text: `\n\nCONVERSATION: Based on the editor content above and our previous chat, respond to the user's latest message:\n\n${userMessage}` });

    const contents = [
      ...chatHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
      {
        role: 'user',
        parts: contextParts,
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

export async function* runInlineActionStream(
  fullContentParts: CanvasPart[],
  selectedText: string,
  action: InlineAction
): AsyncGenerator<StreamEvent> {
  try {
    let actionInstruction = '';
    switch (action) {
      case 'refactor':
        actionInstruction = 'Refactor or improve the following selected text. Return only the improved text, without any explanation or markdown formatting.';
        break;
      case 'explain':
        actionInstruction = 'Provide a concise explanation of the following selected text. The explanation should be clear and targeted, as it will appear in a chat thread.';
        break;
      case 'continue':
        actionInstruction = 'Continue writing from the following selected text. Your response should seamlessly pick up where the selection ends. Return only the continued text, without repeating the original selection or adding explanations.';
        break;
    }

    const promptParts = convertCanvasPartsToGeminiParts(fullContentParts);
    promptParts.push({ text: `\n\nACTION: Please perform the following action on the selected portion of the text above: "${actionInstruction}"\n\n--- SELECTED TEXT ---\n${selectedText}\n--- END SELECTED TEXT ---` });
    
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: promptParts }],
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
    console.error("Error in inline action stream with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    yield {
      textChunk: `Error: ${errorMessage}`
    };
  }
}