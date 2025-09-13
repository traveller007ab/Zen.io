
import React, { useState, useEffect, useCallback } from 'react';
import { ConfigErrorOverlay } from './components/ConfigErrorOverlay';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';
import { StatusBar } from './components/StatusBar';
import { Canvas } from './types';
import * as Workspace from './services/workspaceService';
import { runChatStream, runConversationStream } from './services/geminiService';

const App: React.FC = () => {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleCreateCanvas = async () => {
    const newCanvas = await Workspace.createCanvas(`New Canvas ${canvases.length + 1}`);
    if (newCanvas) {
      setCanvases(prev => [newCanvas, ...prev]);
      setActiveCanvasId(newCanvas.id);
    }
  };

  useEffect(() => {
    const loadWorkspace = async () => {
      const fetchedCanvases = await Workspace.fetchCanvases();
      setCanvases(fetchedCanvases);
      if (fetchedCanvases.length > 0) {
        setActiveCanvasId(fetchedCanvases[0].id);
      } else {
        // If no canvases, create a default one
        handleCreateCanvas();
      }
    };
    loadWorkspace();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteCanvas = async (id: string) => {
    await Workspace.deleteCanvas(id);
    const newCanvases = canvases.filter(c => c.id !== id);
    setCanvases(newCanvases);
    if (activeCanvasId === id) {
      setActiveCanvasId(newCanvases.length > 0 ? newCanvases[0].id : null);
    }
  };

  const handleContentChange = useCallback(async (id: string, content: string) => {
    setCanvases(prev => prev.map(c => c.id === id ? { ...c, content } : c));
    await Workspace.updateCanvas(id, { content });
  }, []);

  const handleGenerate = async () => {
    if (!activeCanvasId || isLoading) return;
    const activeCanvas = canvases.find(c => c.id === activeCanvasId);
    if (!activeCanvas || !activeCanvas.content?.trim()) return;

    setIsLoading(true);
    setCanvases(prev => prev.map(c => c.id === activeCanvasId ? { ...c, output: '' } : c));

    let finalOutput = '';
    try {
      const stream = runChatStream(activeCanvas.content);
      for await (const event of stream) {
        if (event.textChunk) {
          finalOutput += event.textChunk;
          setCanvases(prev => prev.map(c =>
            c.id === activeCanvasId ? { ...c, output: finalOutput } : c
          ));
        }
      }
    } catch (error) {
      console.error("Error during generation:", error);
      finalOutput = "An error occurred while generating the response.";
      setCanvases(prev => prev.map(c => c.id === activeCanvasId ? { ...c, output: finalOutput } : c));
    } finally {
      setIsLoading(false);
      await Workspace.updateCanvas(activeCanvasId, { output: finalOutput });
    }
  };
  
  const handleSendChatMessage = async (message: string) => {
      if (!activeCanvasId || isChatLoading || !message.trim()) return;
      const activeCanvas = canvases.find(c => c.id === activeCanvasId);
      if (!activeCanvas) return;

      const userMessage = { sender: 'user' as const, text: message };
      const currentChatHistory = activeCanvas.chat_history || [];
      const updatedChatHistory = [...currentChatHistory, userMessage];

      setCanvases(prev => prev.map(c => 
          c.id === activeCanvasId ? { ...c, chat_history: updatedChatHistory } : c
      ));
      setIsChatLoading(true);

      const botMessage = { sender: 'bot' as const, text: '' };
      setCanvases(prev => prev.map(c =>
        c.id === activeCanvasId ? { ...c, chat_history: [...updatedChatHistory, botMessage] } : c
      ));

      try {
          const stream = runConversationStream(activeCanvas.content, currentChatHistory, message);
          for await (const event of stream) {
              if (event.textChunk) {
                  botMessage.text += event.textChunk;
                  setCanvases(prev => prev.map(c => {
                      if (c.id === activeCanvasId) {
                          const newHistory = [...updatedChatHistory, botMessage];
                          return { ...c, chat_history: newHistory };
                      }
                      return c;
                  }));
              }
          }
      } catch (error) {
          console.error("Error during chat generation:", error);
          botMessage.text = "I encountered an error. Please try again.";
          setCanvases(prev => prev.map(c => c.id === activeCanvasId ? { ...c, chat_history: [...updatedChatHistory, botMessage] } : c));
      } finally {
          setIsChatLoading(false);
          await Workspace.updateCanvas(activeCanvasId, { chat_history: [...updatedChatHistory, botMessage] });
      }
  };

  if (!process.env.API_KEY) {
    return <ConfigErrorOverlay />;
  }

  const activeCanvas = canvases.find(c => c.id === activeCanvasId);

  return (
    <div className="relative h-screen w-screen">
      <div className="animated-bg"></div>
      <div className="ide-layout">
        <div className="main-content p-4 gap-4">
            <FileExplorerPanel
              canvases={canvases}
              activeCanvasId={activeCanvasId}
              onCreate={handleCreateCanvas}
              onSelect={setActiveCanvasId}
              onDelete={handleDeleteCanvas}
            />
            <div className="flex-grow flex flex-col md:flex-row h-full gap-4">
              <EditorPanel
                  key={activeCanvas?.id} // Re-mount when canvas changes
                  activeCanvas={activeCanvas}
                  onContentChange={handleContentChange}
                  onGenerate={handleGenerate}
                  isLoading={isLoading}
              />
              <OutputPanel
                  activeCanvas={activeCanvas}
                  isLoading={isLoading}
                  isChatLoading={isChatLoading}
                  onSendChatMessage={handleSendChatMessage}
              />
            </div>
        </div>
        <StatusBar />
      </div>
    </div>
  );
};

export default App;