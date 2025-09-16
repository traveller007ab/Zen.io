import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';
import { Canvas, Source, CanvasPart, TextPart, SAFStatus, TaskLogEntry, ChatMessage } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import * as MemoryService from '../services/memoryService';
import { runGenerateStream, runInlineActionStream, InlineAction, runConversationStream } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';


type SaveStatus = 'idle' | 'saving' | 'saved';
type MemoryStatus = 'idle' | 'searching' | 'saving' | 'error';

interface WorkspaceState {
  canvases: Canvas[];
  activeCanvasId: string | null;
  isLoading: boolean; // For main generation
  isChatLoading: boolean; // For chat
  isInlineLoading: boolean; // For inline actions
  isDeleting: boolean; // For delete confirmation
  pendingDeletionCanvasId: string | null; // For two-stage delete
  saveStatus: SaveStatus;
  memoryStatus: MemoryStatus;
  safStatus: SAFStatus;
}

type WorkspaceAction =
  | { type: 'LOAD_CANVASES'; payload: Canvas[] }
  | { type: 'SET_ACTIVE_CANVAS'; payload: string }
  | { type: 'ADD_CANVAS'; payload: Canvas }
  | { type: 'DELETE_CANVAS'; payload: string }
  | { type: 'UPDATE_CANVAS'; payload: Canvas }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_INLINE_LOADING'; payload: boolean }
  | { type: 'SET_DELETING'; payload: boolean }
  | { type: 'INITIATE_DELETE'; payload: string }
  | { type: 'CANCEL_DELETE' }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
  | { type: 'SET_MEMORY_STATUS'; payload: MemoryStatus }
  | { type: 'SET_SAF_STATUS'; payload: SAFStatus };

const initialState: WorkspaceState = {
  canvases: [],
  activeCanvasId: null,
  isLoading: false,
  isChatLoading: false,
  isInlineLoading: false,
  isDeleting: false,
  pendingDeletionCanvasId: null,
  saveStatus: 'idle',
  memoryStatus: 'idle',
  safStatus: 'idle',
};

const INITIAL_CANVAS_CONTENT: CanvasPart[] = [
    {
        type: 'text',
        content: `# Quickstart: Autonomous Web Researcher

This is a pre-loaded example to demonstrate what I can do. I'm not just a chatbot; I'm an autonomous agent designed to accomplish complex tasks.

**Your mission, should you choose to accept it:**

Press the **'⚡ Generate'** button now.

I will execute the following plan:
1.  Use Google Search to find recent, reliable articles about the current state of quantum computing.
2.  Select the top 3-4 most relevant articles and use the \`fetch_web_content\` tool to read them.
3.  Analyze the content to identify key companies and their recent breakthroughs.
4.  Synthesize all the gathered information.
5.  Use the \`create_new_canvas_with_content\` tool to write a comprehensive report in a new file named "quantum_computing_report.md".

You will see my thought process, the tools I use, and the final result in the 'Task Log' and 'Output' panels.

---
**PROMPT:**
Research the current state of quantum computing. Find three key companies in the field, summarize their latest breakthroughs, and compile the findings into a markdown report named 'quantum_computing_report.md'.`
    }
];

const workspaceReducer = (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
  switch (action.type) {
    case 'LOAD_CANVASES':
      return { ...state, canvases: action.payload };
    case 'SET_ACTIVE_CANVAS':
      return { ...state, activeCanvasId: action.payload };
    case 'ADD_CANVAS':
      return { ...state, canvases: [action.payload, ...state.canvases] };
    case 'DELETE_CANVAS':
      return { ...state, canvases: state.canvases.filter(c => c.id !== action.payload) };
    case 'UPDATE_CANVAS':
      return {
        ...state,
        canvases: state.canvases.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CHAT_LOADING':
        return { ...state, isChatLoading: action.payload };
    case 'SET_INLINE_LOADING':
      return { ...state, isInlineLoading: action.payload };
    case 'SET_DELETING':
      return { ...state, isDeleting: action.payload };
    case 'INITIATE_DELETE':
      return { ...state, pendingDeletionCanvasId: action.payload };
    case 'CANCEL_DELETE':
      return { ...state, pendingDeletionCanvasId: null };
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'SET_MEMORY_STATUS':
        return { ...state, memoryStatus: action.payload };
    case 'SET_SAF_STATUS':
        return { ...state, safStatus: action.payload };
    default:
      return state;
  }
};

interface WorkspaceContextType extends WorkspaceState {
  activeCanvas: Canvas | undefined;
  createCanvas: (name?: string, content?: CanvasPart[]) => Promise<Canvas | null>;
  selectCanvas: (id: string) => void;
  deleteCanvas: (id: string) => Promise<void>;
  initiateDelete: (id: string) => void;
  cancelDelete: () => void;
  renameCanvas: (id: string, newName: string) => Promise<void>;
  updateCanvasPart: (id: string, partIndex: number, part: CanvasPart) => void;
  addCanvasPart: (id: string, part: CanvasPart, index?: number) => void;
  removeCanvasPart: (id: string, partIndex: number) => void;
  generate: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  acceptOutput: () => void;
  appendOutput: () => void;
  performInlineAction: (action: InlineAction, selection: { text: string; start: number; end: number }, partIndex: number) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
  // FIX: Replaced `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` for browser compatibility.
  const updateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createCanvas = useCallback(async (name?: string, content?: CanvasPart[]): Promise<Canvas | null> => {
    const newName = name || `New Canvas ${state.canvases.length + 1}`;
    const newCanvas = await WorkspaceService.createCanvas(newName, content);
    if (newCanvas) {
      dispatch({ type: 'ADD_CANVAS', payload: newCanvas });
      dispatch({ type: 'SET_ACTIVE_CANVAS', payload: newCanvas.id });
    }
    return newCanvas;
  }, [state.canvases.length]);

  // Initial Load
  useEffect(() => {
    const loadWorkspace = async () => {
      const fetchedCanvases = await WorkspaceService.fetchCanvases();
      dispatch({ type: 'LOAD_CANVASES', payload: fetchedCanvases });
      if (fetchedCanvases.length > 0) {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: fetchedCanvases[0].id });
      } else {
        createCanvas('Quickstart: Autonomous Web Researcher', INITIAL_CANVAS_CONTENT);
      }
    };
    loadWorkspace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCanvas = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CANVAS', payload: id });
  };
  
  const initiateDelete = (id: string) => {
    dispatch({ type: 'INITIATE_DELETE', payload: id });
  };

  const cancelDelete = () => {
    dispatch({ type: 'CANCEL_DELETE' });
  };

  const deleteCanvas = async (id: string) => {
    dispatch({ type: 'SET_DELETING', payload: true });
    const success = await WorkspaceService.deleteCanvas(id);
    dispatch({ type: 'SET_DELETING', payload: false });
    dispatch({ type: 'CANCEL_DELETE' }); // Clear pending state regardless of outcome
    
    if (success) {
      const remainingCanvases = state.canvases.filter(c => c.id !== id);
      dispatch({ type: 'DELETE_CANVAS', payload: id });
      
      if (state.activeCanvasId === id) {
        if (remainingCanvases.length > 0) {
            dispatch({ type: 'SET_ACTIVE_CANVAS', payload: remainingCanvases[0].id });
        } else {
            createCanvas('Quickstart: Autonomous Web Researcher', INITIAL_CANVAS_CONTENT);
        }
      }
    } else {
      alert(
        "Failed to delete the canvas.\n\n" +
        "This is likely due to missing Row Level Security (RLS) policies in your Supabase project. " +
        "Please go to your Supabase SQL Editor and run the full setup script from 'services/supabaseClient.ts' to apply the necessary permissions."
      );
    }
  };

  const _updateCanvasDatabase = useCallback((id: string, updates: Partial<Omit<Canvas, 'id'>>) => {
      dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
      if(updateTimeout.current) clearTimeout(updateTimeout.current);

      updateTimeout.current = setTimeout(async () => {
        const updatedCanvas = await WorkspaceService.updateCanvas(id, updates);
        if (updatedCanvas) {
            dispatch({ type: 'UPDATE_CANVAS', payload: updatedCanvas });
        }
        dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
        setTimeout(() => dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' }), 2000);
      }, 500);
  }, []);

  const renameCanvas = async (id: string, newName: string) => {
    const canvas = state.canvases.find(c => c.id === id);
    if(canvas) {
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...canvas, name: newName } });
        _updateCanvasDatabase(id, { name: newName });
    }
  };
  
  const updateCanvasPart = (id: string, partIndex: number, part: CanvasPart) => {
    const targetCanvas = state.canvases.find(c => c.id === id);
    if (!targetCanvas) return;
    const newContent = [...targetCanvas.content];
    newContent[partIndex] = part;
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
    _updateCanvasDatabase(id, { content: newContent });
  };

  const addCanvasPart = (id: string, part: CanvasPart, index?: number) => {
    const targetCanvas = state.canvases.find(c => c.id === id);
    if (!targetCanvas) return;
    const newContent = [...targetCanvas.content];
    if (index !== undefined) {
      newContent.splice(index, 0, part);
    } else {
      newContent.push(part);
    }
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
    _updateCanvasDatabase(id, { content: newContent });
  };

  const removeCanvasPart = (id: string, partIndex: number) => {
    const targetCanvas = state.canvases.find(c => c.id === id);
    if (!targetCanvas) return;
    const newContent = targetCanvas.content.filter((_, i) => i !== partIndex);
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
    _updateCanvasDatabase(id, { content: newContent });
  };
  
  const executeTool = useCallback(async (name: string, args: any): Promise<any> => {
    if (name === 'fetch_web_content') {
        const { data, error } = await supabase.functions.invoke('scrape', { body: { url: args.url } });
        return error ? { error: error.message } : { content: data.content };
    }
    if (name === 'create_new_canvas_with_content') {
        const newCanvas = await createCanvas(args.name, [{ type: 'text', content: args.content }]);
        return { success: !!newCanvas, canvasId: newCanvas?.id, canvasName: newCanvas?.name };
    }
    // googleSearch is handled natively by the Gemini API.
    return { error: `Tool "${name}" is not implemented.` };
  }, [createCanvas]);

  const generate = useCallback(async () => {
    if (!state.activeCanvasId || state.isLoading || !activeCanvas) return;
    if (!activeCanvas.content || activeCanvas.content.length === 0) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: '', output_sources: [], task_log: [] }});
    
    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'searching' });
    const queryText = activeCanvas.content.filter(p => p.type === 'text').map(p => p.content).join('\n');
    const memories = await MemoryService.searchMemories(queryText);
    const memoryContext = memories.map(m => m.content).join('\n---\n');
    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });

    let finalOutput = '';
    let taskLog: TaskLogEntry[] = [];
    try {
      const stream = runGenerateStream(activeCanvas.content, memoryContext, executeTool);
      for await (const event of stream) {
        if (event.safStatus) {
            dispatch({ type: 'SET_SAF_STATUS', payload: event.safStatus });
        }
        if (event.taskLogEntry) {
            taskLog = [...taskLog, event.taskLogEntry];
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, task_log: [...taskLog] } });
        }
        if (event.textChunk) {
            finalOutput += event.textChunk;
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: finalOutput, task_log: [...taskLog] }});
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SAF_STATUS', payload: 'idle' });
      _updateCanvasDatabase(state.activeCanvasId, { output: finalOutput, task_log: taskLog });
    }
  }, [state.activeCanvasId, state.isLoading, activeCanvas, executeTool, _updateCanvasDatabase]);

  const sendChatMessage = useCallback(async (message: string) => {
    if (!activeCanvas || state.isChatLoading) return;

    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    const userMessage: ChatMessage = { sender: 'user', text: message };
    const currentHistory = activeCanvas.chat_history || [];
    const updatedHistory = [...currentHistory, userMessage];

    // Optimistically update UI
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: updatedHistory } });
    
    let botResponse = '';
    const botMessage: ChatMessage = { sender: 'bot', text: '' };
    const finalHistory = [...updatedHistory, botMessage];

    try {
        const stream = runConversationStream(activeCanvas.content, currentHistory, message);
        for await (const event of stream) {
            if (event.textChunk) {
                botResponse += event.textChunk;
                botMessage.text = botResponse;
                dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
            }
            if (event.error) {
                botMessage.text = event.error;
                dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
            }
        }
    } catch (e) {
        console.error("Chat failed:", e);
        botMessage.text = "Sorry, I encountered an error.";
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
    } finally {
        dispatch({ type: 'SET_CHAT_LOADING', payload: false });
        _updateCanvasDatabase(activeCanvas.id, { chat_history: finalHistory });
    }

  }, [activeCanvas, state.isChatLoading, _updateCanvasDatabase]);
  
  const acceptOutput = useCallback(() => {
    if (!activeCanvas || !activeCanvas.output) return;
    const newContent: CanvasPart[] = [{ type: 'text', content: activeCanvas.output }];
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
    _updateCanvasDatabase(activeCanvas.id, { content: newContent });
    
    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
    MemoryService.createMemory(activeCanvas.output).finally(() => {
        dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });
    });
  }, [activeCanvas, _updateCanvasDatabase]);

  const appendOutput = useCallback(() => {
    if (!activeCanvas || !activeCanvas.output) return;
    const newContent = [...activeCanvas.content, { type: 'text' as const, content: '\n\n' + activeCanvas.output }];
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
    _updateCanvasDatabase(activeCanvas.id, { content: newContent });

    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
    MemoryService.createMemory(activeCanvas.output).finally(() => {
        dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });
    });
  }, [activeCanvas, _updateCanvasDatabase]);

  const performInlineAction = useCallback(async (action: InlineAction, selection: { text: string; start: number; end: number }, partIndex: number) => {
    if (!activeCanvas) return;
    
    dispatch({ type: 'SET_INLINE_LOADING', payload: true });
    
    try {
        const stream = runInlineActionStream(activeCanvas.content, selection.text, action);
        let resultText = '';
        for await (const event of stream) {
            if(event.textChunk) resultText += event.textChunk;
        }

        const targetPart = activeCanvas.content[partIndex];
        if (targetPart.type !== 'text') return;
        
        if (action === 'refactor') {
            const newText = targetPart.content.substring(0, selection.start) + resultText + targetPart.content.substring(selection.end);
            updateCanvasPart(activeCanvas.id, partIndex, { ...targetPart, content: newText });
        } else if (action === 'continue') {
            const newText = targetPart.content.substring(0, selection.end) + resultText + targetPart.content.substring(selection.end);
            updateCanvasPart(activeCanvas.id, partIndex, { ...targetPart, content: newText });
        } else if (action === 'explain') {
            const newLogEntry: TaskLogEntry = { type: 'thought', content: `**Explanation for selected text:**\n\n${resultText}`};
            const newLog = [...(activeCanvas.task_log || []), newLogEntry];
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, task_log: newLog } });
            _updateCanvasDatabase(activeCanvas.id, { task_log: newLog });
        }
    } catch (e) {
      console.error("Inline action failed:", e);
    } finally {
      dispatch({ type: 'SET_INLINE_LOADING', payload: false });
    }

  }, [activeCanvas, updateCanvasPart, _updateCanvasDatabase]);


  return (
    <WorkspaceContext.Provider value={{
      ...state,
      activeCanvas,
      createCanvas,
      selectCanvas,
      deleteCanvas,
      initiateDelete,
      cancelDelete,
      renameCanvas,
      updateCanvasPart,
      addCanvasPart,
      removeCanvasPart,
      generate,
      sendChatMessage,
      acceptOutput,
      appendOutput,
      performInlineAction,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};