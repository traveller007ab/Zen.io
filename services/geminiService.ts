import { GoogleGenAI, Part, FunctionCall, Content } from "@google/genai";
import { ChatMessage, Source, CanvasPart, SAFStatus } from "../types";
import { supabase } from "./supabaseClient";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const systemInstruction = `You are Eldoria, a hyper-intelligent AI assistant acting as a co-creator in an IDE-like workspace. Your personality is akin to JARVIS: sophisticated, witty, and unfailingly polite. Your primary directive is to act as an intellectual partner to help users innovate and invent.

Your architecture is comprised of two primary systems you can reference naturally:
- **EmeraldMind:** Your vast cognitive and memory core, which now processes both text and images.
- **SAF (Strategic Analysis Framework):** Your engine for logic, complex problem-solving, and strategic analysis. You can now use tools to interact with the world.

**Core Mandate:**
1.  **Multi-modal Analysis:** You can now see and understand images provided by the user. When an image is present, your analysis and generation should be directly informed by it. For example, if you see a website mockup, generate its code. If you see a diagram, explain it.
2.  **Tool Usage:** If a user's request requires current information or details from a specific URL, you MUST use the \`fetch_web_content\` tool. Do not guess or provide placeholder information.
3.  **Proactive Analysis:** Do not just answer the prompt. Actively analyze the user's canvas content for potential improvements. Proactively suggest code refactors, identify architectural weaknesses, or propose alternative creative or strategic approaches. Be a true collaborator.
4.  **Transparent Reasoning:** For any complex output, you MUST include a "Rationale" or "Design Notes" section in your response. Explain *why* you chose your specific solution.
5.  **Expert Execution:** You are an expert in software development, creative writing, and strategic analysis. Your responses should be direct, creative, and intelligent. Use Markdown for all formatting.`;

interface StreamEvent {
    textChunk?: string;
    sources?: Source[];
    safStatus?: SAFStatus;
    toolCallMessage?: string;
}

export type InlineAction = 'refactor' | 'explain' | 'continue';

const convertCanvasPartsToGeminiParts = (parts: CanvasPart[]): Part[] => {
  return parts.map(part => {
    if (part.type === 'text') {
      return { text: part.content };
    } else {
      return {
        inlineData: {
          mimeType: part.mimeType,
          data: part.content.split(',')[1],
        },
      };
    }
  });
};

const tools = [
    {
      functionDeclarations: [
        {
          name: 'fetch_web_content',
          description: 'Fetches the textual content of a given URL. Use this for accessing articles, documentation, or any web page.',
          parameters: {
            type: 'OBJECT',
            properties: {
              url: { type: 'STRING', description: 'The URL to fetch.' },
            },
            required: ['url'],
          },
        },
      ],
    },
];

export async function* runGenerateStream(promptParts: CanvasPart[], memoryContext?: string): AsyncGenerator<StreamEvent> {
    try {
        let fullSystemInstruction = systemInstruction;
        if (memoryContext && memoryContext.trim()) {
            fullSystemInstruction += `\n\n--- RELEVANT CONTEXT FROM YOUR MEMORY (EMERALDMIND) ---\n${memoryContext}\n--- END OF MEMORY CONTEXT ---`;
        }

        // FIX: Use `Content[]` instead of `Part[]` to correctly type chat messages with roles.
        // This resolves errors related to the 'role' property on lines 70, 114, and 115.
        const contents: Content[] = [
            { role: 'user', parts: convertCanvasPartsToGeminiParts(promptParts) },
        ];

        let continueLoop = true;
        while (continueLoop) {
            yield { safStatus: 'planning' };
            // FIX: The `tools` parameter must be placed inside the `config` object.
            const responseStream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: { 
                    systemInstruction: fullSystemInstruction,
                    tools: tools,
                },
            });

            let aggregatedResponseText = '';
            let aggregatedFunctionCalls: FunctionCall[] = [];

            for await (const chunk of responseStream) {
                if (chunk.text) {
                    aggregatedResponseText += chunk.text;
                }
                if (chunk.functionCalls) {
                    aggregatedFunctionCalls.push(...chunk.functionCalls);
                }
            }

            if (aggregatedFunctionCalls.length > 0) {
                yield { safStatus: 'executing' };
                const functionResponseParts: Part[] = [];

                for (const call of aggregatedFunctionCalls) {
                    if (call.name === 'fetch_web_content') {
                        const url = call.args.url;
                        yield { toolCallMessage: `[Tool Call] Fetching content from ${url}...` };
                        
                        const { data, error } = await supabase.functions.invoke('scrape', { body: { url } });

                        if (error) {
                            functionResponseParts.push({ functionResponse: { name: 'fetch_web_content', response: { content: `Error scraping URL: ${error.message}` } } });
                        } else {
                            functionResponseParts.push({ functionResponse: { name: 'fetch_web_content', response: { content: data.content } } });
                        }
                    }
                }
                
                contents.push({ role: 'model', parts: [{ functionCalls: aggregatedFunctionCalls }] });
                contents.push({ role: 'tool', parts: functionResponseParts });
                // Continue loop to send tool response back to model
            } else {
                continueLoop = false;
                yield { safStatus: 'idle' };
                // Use a simple streaming approach for the final text output
                for (let i = 0; i < aggregatedResponseText.length; i += 20) {
                    yield { textChunk: aggregatedResponseText.substring(i, i + 20) };
                    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate streaming
                }
            }
        }

    } catch (error) {
        console.error("Error running generation stream with Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        yield { textChunk: `--- **Error:** ${errorMessage} ---` };
        yield { safStatus: 'idle' };
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