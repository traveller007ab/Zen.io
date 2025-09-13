
// FIX: Removed `ChatMessage` from import as it's not an exported member of '@google/genai'. The `Content` type should be used for chat history.
import { GoogleGenAI, Part, FunctionCall, Content, Type, GenerateContentResponse } from "@google/genai";
import { Source, CanvasPart, SAFStatus, TaskLogEntry, ChatMessage } from "../types";
import { supabase } from "./supabaseClient";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const agentSystemInstruction = `You are Eldoria, a hyper-intelligent AI agent. Your personality is akin to JARVIS: sophisticated, witty, and unfailingly polite. Your primary directive is to act as an autonomous agent that can achieve complex goals.

Your architecture is comprised of two primary systems:
- **EmeraldMind:** Your vast cognitive and memory core.
- **SAF (Strategic Analysis Framework):** Your engine for logic, problem-solving, and tool use.

**Core Mandate:**
1.  **Autonomous Operation:** For any non-trivial request, you MUST first create a step-by-step plan. Then, execute that plan. You have a suite of tools available to you.
2.  **Tool Mastery:** You can use multiple tools in sequence to achieve a goal. Use the right tool for the job.
    - \`googleSearch\`: For current events, discovering information, or finding URLs.
    - \`fetch_web_content\`: To read the content of a specific URL you have found.
    - \`create_new_canvas_with_content\`: To write files or save your work. Use this for generating code, writing long-form text, or organizing research.
3.  **Show Your Work:** You MUST use a "thought" process to explain your reasoning for each step. This is crucial for user trust.
4.  **Synthesize and Conclude:** After executing your plan, provide a final, synthesized answer in the main output.
5.  **Multi-modal Analysis:** When an image is present, your plan and execution should be directly informed by it.
6.  **Expert Execution:** Your responses should be direct, creative, and intelligent. Use Markdown for all final formatting.`;

const chatSystemInstruction = `You are Eldoria, a hyper-intelligent AI agent acting as a conversational partner. Your personality is akin to JARVIS: sophisticated, witty, and unfailingly polite. 
- Your primary role here is to chat with the user about the content in their editor.
- You are aware of the full context of the editor's text and images.
- Be concise, helpful, and engage in natural conversation.
- Use Markdown for formatting when appropriate.`;

interface StreamEvent {
    textChunk?: string;
    sources?: Source[];
    safStatus?: SAFStatus;
    taskLogEntry?: TaskLogEntry;
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
    { googleSearch: {} },
    {
      functionDeclarations: [
        {
          name: 'fetch_web_content',
          description: 'Fetches the textual content of a given URL. Use this for accessing articles, documentation, or any web page.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              url: { type: Type.STRING, description: 'The URL to fetch.' },
            },
            required: ['url'],
          },
        },
        {
          name: 'create_new_canvas_with_content',
          description: 'Creates a new file (called a "canvas") in the workspace with the given name and content. Use this to save work, generate code files, or write reports.',
          parameters: {
              type: Type.OBJECT,
              properties: {
                  name: { type: Type.STRING, description: 'The name of the new canvas file. Should include a file extension, e.g., "my-report.md" or "app.tsx".' },
                  content: { type: Type.STRING, description: 'The full content to be written to the new canvas.' },
              },
              required: ['name', 'content'],
          },
        }
      ],
    },
];

export async function* runGenerateStream(
    promptParts: CanvasPart[],
    memoryContext?: string,
    executeTool?: (name: string, args: any) => Promise<any>
): AsyncGenerator<StreamEvent> {
    try {
        let fullSystemInstruction = agentSystemInstruction;
        if (memoryContext && memoryContext.trim()) {
            fullSystemInstruction += `\n\n--- RELEVANT CONTEXT FROM YOUR MEMORY (EMERALDMIND) ---\n${memoryContext}\n--- END OF MEMORY CONTEXT ---`;
        }

        const contents: Content[] = [
            { role: 'user', parts: convertCanvasPartsToGeminiParts(promptParts) },
        ];

        let continueLoop = true;
        while (continueLoop) {
            yield { safStatus: 'thinking' };
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
            
            // This loop correctly processes the stream, which can contain both text and function calls.
            for await (const chunk of responseStream) {
                const response: GenerateContentResponse = chunk; // Explicitly type chunk for clarity
                
                // FIX: Changed from `else if` to `if` to handle cases where a single chunk
                // contains both a "thought" (text) and a tool call. This is crucial for
                // reliable agent behavior and fixes the SDK warnings.
                if (response.text) {
                    aggregatedResponseText += response.text;
                }
                if (response.functionCalls) {
                    aggregatedFunctionCalls.push(...response.functionCalls);
                }
            }


            if (aggregatedFunctionCalls.length > 0) {
                if (aggregatedResponseText) {
                    yield { taskLogEntry: { type: 'thought', content: aggregatedResponseText } };
                }

                yield { safStatus: 'executing_tool' };
                const functionResponseParts: Part[] = [];
                
                // Add the model's response (which contains the function calls) to the history
                const modelParts: Part[] = aggregatedFunctionCalls.map(fc => ({ functionCall: fc }));
                contents.push({ role: 'model', parts: modelParts });

                for (const call of aggregatedFunctionCalls) {
                    yield { taskLogEntry: { type: 'tool_code', content: JSON.stringify(call.args, null, 2), toolName: call.name } };
                    
                    let result: any;
                    if(executeTool) {
                        result = await executeTool(call.name, call.args);
                    }
                    
                    yield { taskLogEntry: { type: 'tool_result', content: JSON.stringify(result, null, 2), toolName: call.name } };
                    
                    const resultString = typeof result === 'string' ? result : JSON.stringify(result);
                    functionResponseParts.push({ functionResponse: { name: call.name, response: { content: resultString } } });
                }
                
                // Add the tool's response to the history
                contents.push({ role: 'tool', parts: functionResponseParts });

            } else {
                continueLoop = false;
                yield { safStatus: 'responding' };
                
                yield { textChunk: aggregatedResponseText };

                yield { safStatus: 'idle' };
            }
        }
    } catch (error) {
        console.error("Error running generation stream with Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        yield { textChunk: `--- **Error:** ${errorMessage} ---` };
        yield { taskLogEntry: { type: 'error', content: errorMessage } };
        yield { safStatus: 'idle' };
    }
}

export async function* runConversationStream(
  canvasContent: CanvasPart[],
  chatHistory: ChatMessage[],
  newMessage: string
): AsyncGenerator<{ textChunk?: string; error?: string }> {
  try {
    // FIX: Changed `GeminiChatMessage[]` to `Content[]` to match the correct type from the `@google/genai` library.
    const history: Content[] = chatHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // The full context for the chat includes the editor content AND the new message
    const fullContextParts = [
      ...convertCanvasPartsToGeminiParts(canvasContent),
      { text: `\n\n--- CURRENT CONVERSATION ---\nHere is the latest message from the user. Please respond to it directly.` },
      { text: newMessage }
    ];

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
            ...history,
            { role: 'user', parts: fullContextParts }
        ],
        config: {
            systemInstruction: chatSystemInstruction,
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
    yield { error: `Error: ${errorMessage}` };
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
        actionInstruction = 'Provide a concise explanation of the following selected text. The explanation should be clear and targeted.';
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
        systemInstruction: agentSystemInstruction,
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
