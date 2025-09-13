import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import { Canvas, ChatMessage, Source, CanvasPart, TextPart, ImagePart, SAFStatus } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import * as MemoryService from '../services/memoryService';
import { runGenerateStream, runConversationStream, runInlineActionStream, InlineAction } from '../services/geminiService';

type SaveStatus = 'idle' | 'saving' | 'saved';
type MemoryStatus = 'idle' | 'searching' | 'saving' | 'error';

interface WorkspaceState {
  canvases: Canvas[];
  activeCanvasId: string | null;
  isLoading: boolean; // For main generation
  isChatLoading: boolean; // For conversation
  isInlineLoading: boolean; // For inline actions
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
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
  | { type: 'SET_MEMORY_STATUS'; payload: MemoryStatus }
  | { type: 'SET_SAF_STATUS'; payload: SAFStatus };

const initialState: WorkspaceState = {
  canvases: [],
  activeCanvasId: null,
  isLoading: false,
  isChatLoading: false,
  isInlineLoading: false,
  saveStatus: 'idle',
  memoryStatus: 'idle',
  safStatus: 'idle',
};

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
  createCanvas: () => Promise<void>;
  selectCanvas: (id: string) => void;
  deleteCanvas: (id: string) => Promise<void>;
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

  // Initial Load
  useEffect(() => {
    const loadWorkspace = async () => {
      const fetchedCanvases = await WorkspaceService.fetchCanvases();
      dispatch({ type: 'LOAD_CANVASES', payload: fetchedCanvases });
      if (fetchedCanvases.length > 0) {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: fetchedCanvases[0].id });
      } else {
        createCanvas();
      }
    };
    loadWorkspace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCanvas = useCallback(async () => {
    const newCanvas = await WorkspaceService.createCanvas(`New Canvas ${state.canvases.length + 1}`);
    if (newCanvas) {
      dispatch({ type: 'ADD_CANVAS', payload: newCanvas });
      dispatch({ type: 'SET_ACTIVE_CANVAS', payload: newCanvas.id });
    }
  }, [state.canvases.length]);

  const selectCanvas = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CANVAS', payload: id });
  };

  const deleteCanvas = async (id: string) => {
    await WorkspaceService.deleteCanvas(id);
    dispatch({ type: 'DELETE_CANVAS', payload: id });
    if (state.activeCanvasId === id) {
      const newActiveId = state.canvases.length > 1 ? state.canvases.find(c => c.id !== id)!.id : null;
      if (newActiveId) {
          dispatch({ type: 'SET_ACTIVE_CANVAS', payload: newActiveId });
      } else {
          createCanvas();
      }
    }
  };

  const _updateCanvasDatabase = async (id: string, updates: Partial<Omit<Canvas, 'id'>>) => {
      dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
      const updatedCanvas = await WorkspaceService.updateCanvas(id, updates);
      if (updatedCanvas) {
          dispatch({ type: 'UPDATE_CANVAS', payload: updatedCanvas });
      }
      setTimeout(() => dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' }), 500);
      setTimeout(() => dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' }), 2000);
  };

  const renameCanvas = async (id: string, newName: string) => {
    _updateCanvasDatabase(id, { name: newName });
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

  const generate = async () => {
    if (!state.activeCanvasId || state.isLoading || !activeCanvas) return;
    if (!activeCanvas.content || activeCanvas.content.length === 0) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: '', output_sources: [] }});
    
    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'searching' });
    const queryText = activeCanvas.content.filter(p => p.type === 'text').map(p => p.content).join('\n');
    const memories = await MemoryService.searchMemories(queryText);
    const memoryContext = memories.map(m => m.content).join('\n---\n');
    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });

    let finalOutput = '';
    let finalSources: Source[] = [];
    try {
      const stream = runGenerateStream(activeCanvas.content, memoryContext);
      for await (const event of stream) {
        const currentCanvas = state.canvases.find(c => c.id === state.activeCanvasId)!;
        
        if (event.safStatus) {
            dispatch({ type: 'SET_SAF_STATUS', payload: event.safStatus });
        }
        if (event.toolCallMessage) {
            finalOutput += `\n${event.toolCallMessage}\n`;
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...currentCanvas, output: finalOutput } });
        }
        if (event.textChunk) {
          finalOutput += event.textChunk;
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...currentCanvas, output: finalOutput }});
        }
        if (event.sources) {
          const existingUris = new Set(finalSources.map(s => s.uri));
          const newSources = event.sources.filter(s => !existingUris.has(s.uri));
          if (newSources.length > 0) {
            finalSources = [...finalSources, ...newSources];
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...currentCanvas, output: finalOutput, output_sources: finalSources }});
          }
        }
      }
    } catch (error) {
       console.error("Error during generation:", error);
       finalOutput = "An error occurred while generating the response.";
       dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: finalOutput, output_sources: [] }});
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SAF_STATUS', payload: 'idle' });
      _updateCanvasDatabase(state.activeCanvasId, { output: finalOutput, output_sources: finalSources });
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!state.activeCanvasId || state.isChatLoading || !activeCanvas) return;
    
    const userMessage: ChatMessage = { sender: 'user', text: message };
    const currentHistory = activeCanvas.chat_history || [];
    const optimisticHistory = [...currentHistory, userMessage];
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: optimisticHistory }});
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    const botMessage: ChatMessage = { sender: 'bot', text: '' };
    const historyWithBotPlaceholder = [...optimisticHistory, botMessage];
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: historyWithBotPlaceholder }});

    try {
        const stream = runConversationStream(activeCanvas.content, currentHistory, message);
        for await (const event of stream) {
            if (event.textChunk) {
                botMessage.text += event.textChunk;
                dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...optimisticHistory, botMessage] }});
            }
        }
    } catch (error) {
        console.error("Error during chat generation:", error);
        botMessage.text = "I encountered an error. Please try again.";
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...optimisticHistory, botMessage] }});
    } finally {
        dispatch({ type: 'SET_CHAT_LOADING', payload: false });
        _updateCanvasDatabase(state.activeCanvasId, { chat_history: [...optimisticHistory, botMessage] });
    }
  };
  
  const commitToMemory = async (content: string) => {
      dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
      await MemoryService.createMemory(content);
      setTimeout(() => dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' }), 2000);
  };
  
  const acceptOutput = () => {
      if(activeCanvas && activeCanvas.output) {
          const newPart: TextPart = { type: 'text', content: activeCanvas.output };
          const newContent = [newPart];
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
          _updateCanvasDatabase(activeCanvas.id, { content: newContent });
          commitToMemory(activeCanvas.output);
      }
  };

  const appendOutput = () => {
      if(activeCanvas && activeCanvas.output) {
          addCanvasPart(activeCanvas.id, { type: 'text', content: `\n\n${activeCanvas.output}` });
          commitToMemory(activeCanvas.output);
      }
  };

  const performInlineAction = async (action: InlineAction, selection: { text: string; start: number; end: number }, partIndex: number) => {
    if (!state.activeCanvasId || state.isInlineLoading || !activeCanvas) return;

    dispatch({ type: 'SET_INLINE_LOADING', payload: true });

    try {
        const stream = runInlineActionStream(activeCanvas.content, selection.text, action);
        
        if (action === 'explain') {
            const botMessage: ChatMessage = { sender: 'bot', text: `**Explanation for:** "*${selection.text.substring(0, 50)}...*"\n\n` };
            const currentHistory = activeCanvas.chat_history || [];
            const optimisticHistory = [...currentHistory, botMessage];
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: optimisticHistory }});

            for await (const event of stream) {
                if (event.textChunk) {
                    botMessage.text += event.textChunk;
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...currentHistory, botMessage] }});
                }
            }
            _updateCanvasDatabase(state.activeCanvasId, { chat_history: [...currentHistory, botMessage] });

        } else { // 'refactor' or 'continue'
            let generatedText = '';
            const targetPart = activeCanvas.content[partIndex];
            if (targetPart.type !== 'text') return;

            const originalContent = targetPart.content;
            const prefix = originalContent.substring(0, selection.start);
            const suffix = originalContent.substring(selection.end);
            
            for await (const event of stream) {
                if (event.textChunk) {
                    generatedText += event.textChunk;
                    const newPartContent = action === 'continue'
                        ? prefix + selection.text + generatedText + suffix
                        // For refactor, we replace the selection
                        : prefix + generatedText + suffix;
                    
                    const newContent = [...activeCanvas.content];
                    newContent[partIndex] = { ...targetPart, content: newPartContent };

                    // Live update UI without saving yet
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent }});
                }
            }
            const finalPartContent = action === 'continue'
                ? prefix + selection.text + generatedText + suffix
                : prefix + generatedText + suffix;
            
            const finalContent = [...activeCanvas.content];
            finalContent[partIndex] = { ...targetPart, content: finalPartContent };
            // Final save
            _updateCanvasDatabase(state.activeCanvasId, { content: finalContent });
        }
    } catch (error) {
        console.error("Error during inline action:", error);
    } finally {
        dispatch({ type: 'SET_INLINE_LOADING', payload: false });
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      ...state,
      activeCanvas,
      createCanvas,
      selectCanvas,
      deleteCanvas,
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
