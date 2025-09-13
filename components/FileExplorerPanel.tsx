import React from 'react';
import { Canvas } from '../types';
import { ZenBotLogo } from './Icons';

interface FileExplorerPanelProps {
  canvases: Canvas[];
  activeCanvasId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const CanvasItem: React.FC<{ canvas: Canvas; isActive: boolean; onSelect: () => void; onDelete: (e: React.MouseEvent) => void; }> = ({ canvas, isActive, onSelect, onDelete }) => (
  <div
    onClick={onSelect}
    className={`flex justify-between items-center px-3 py-2 rounded-md cursor-pointer group transition-all duration-300 relative border border-transparent ${isActive ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_var(--glow-color)]' : 'text-cyan-200/70 hover:bg-cyan-500/10'}`}
  >
    <span className="truncate pr-2 text-sm">{canvas.name}</span>
    <button onClick={onDelete} className="text-cyan-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
      ✕
    </button>
  </div>
);

export const FileExplorerPanel: React.FC<FileExplorerPanelProps> = ({ canvases, activeCanvasId, onCreate, onSelect, onDelete }) => {
  return (
    <div className="panel w-full md:w-64 lg:w-72 p-4 flex flex-col shrink-0">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-cyan-500/20">
        <ZenBotLogo className="w-9 h-9 text-cyan-400 text-glow" />
        <div>
          <h1 className="text-xl font-bold text-cyan-300 text-glow">
            ZenBot IDE
          </h1>
          <p className="text-xs text-cyan-400/80">Holographic Workspace</p>
        </div>
      </div>
      
      <button
        onClick={onCreate}
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
              onSelect={() => onSelect(canvas.id)}
              onDelete={(e) => {
                e.stopPropagation(); // prevent selection when deleting
                if(window.confirm(`Are you sure you want to delete "${canvas.name}"?`)){
                   onDelete(canvas.id);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};