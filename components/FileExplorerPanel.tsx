
import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '../types';
import { EldoriaLogo, PencilIcon } from './Icons';
import { useWorkspace } from '../context/WorkspaceContext';

interface CanvasItemProps {
  canvas: Canvas;
  isActive: boolean;
}

const CanvasItem: React.FC<CanvasItemProps> = ({ canvas, isActive }) => {
    const { selectCanvas, deleteCanvas, renameCanvas } = useWorkspace();
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(canvas.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);
    
    const handleRename = () => {
        if (name.trim() && name !== canvas.name) {
            renameCanvas(canvas.id, name.trim());
        } else {
            setName(canvas.name);
        }
        setIsRenaming(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setName(canvas.name);
            setIsRenaming(false);
        }
    };

    return (
      <div
        onClick={() => !isRenaming && selectCanvas(canvas.id)}
        onDoubleClick={() => setIsRenaming(true)}
        className={`flex justify-between items-center px-3 py-2 rounded-md cursor-pointer group transition-all duration-300 relative border border-transparent ${isActive ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_var(--glow-color)]' : 'text-cyan-200/70 hover:bg-cyan-500/10'}`}
      >
        {isRenaming ? (
            <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-cyan-200 outline-none border border-cyan-500 rounded-sm px-1 text-sm"
            />
        ) : (
          <>
            <span className="truncate pr-2 text-sm">{canvas.name}</span>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setIsRenaming(true)} className="p-1 mr-1 text-cyan-400/70 hover:text-cyan-300">
                    <PencilIcon className="w-3 h-3"/>
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm(`Are you sure you want to delete "${canvas.name}"?`)){
                            deleteCanvas(canvas.id);
                        }
                    }} 
                    className="p-1 text-cyan-500/50 hover:text-red-400 text-xs"
                >
                ✕
                </button>
            </div>
          </>
        )}
      </div>
    );
};

export const FileExplorerPanel: React.FC = () => {
  const { canvases, activeCanvasId, createCanvas } = useWorkspace();
  
  return (
    <div className="panel w-full md:w-64 lg:w-72 p-4 flex flex-col shrink-0">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-cyan-500/20">
        <EldoriaLogo className="w-9 h-9 text-cyan-400 text-glow" />
        <div>
          <h1 className="text-xl font-bold text-cyan-300 text-glow">
            Eldoria IDE
          </h1>
          <p className="text-xs text-cyan-400/80">Holographic Workspace</p>
        </div>
      </div>
      
      <button
        onClick={createCanvas}
        className="w-full text-center bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium py-2 px-4 rounded-md transition-all mb-4 text-sm"
      >
        + New Canvas
      </button>

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-1">
          {canvases.map(canvas => (
            <CanvasItem
              key={canvas.id}
              canvas={canvas}
              isActive={canvas.id === activeCanvasId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};