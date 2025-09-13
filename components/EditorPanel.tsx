import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '../types';

interface EditorPanelProps {
  activeCanvas: Canvas | undefined;
  onContentChange: (id: string, content: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ activeCanvas, onContentChange, onGenerate, isLoading }) => {
  const [content, setContent] = useState(activeCanvas?.content || '');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(activeCanvas?.content || '');
  }, [activeCanvas]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (activeCanvas) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onContentChange(activeCanvas.id, newContent);
      }, 500); // Debounce save by 500ms
    }
  };

  return (
    <div className="panel w-full md:w-1/2 flex flex-col">
      <div className="flex-grow p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-cyan-500/20">
            <h2 className="text-lg font-semibold text-cyan-300 text-glow">Editor</h2>
            <button
                onClick={onGenerate}
                disabled={isLoading || !activeCanvas?.content?.trim()}
                className={`bg-cyan-500 text-slate-900 font-bold py-2 px-6 rounded-md transition-all duration-300 shadow-[0_0_10px_var(--glow-color)] hover:shadow-[0_0_20px_var(--glow-color)] disabled:bg-cyan-500/20 disabled:text-cyan-500/50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 ${isLoading ? 'animate-pulse-glow' : ''}`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : '⚡ Generate'}
            </button>
        </div>
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Initiate innovation sequence..."
          className="w-full h-full bg-transparent text-cyan-300 focus:outline-none resize-none text-base leading-relaxed custom-scrollbar pr-2"
        />
      </div>
    </div>
  );
};