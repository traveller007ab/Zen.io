import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '../types';
import { EldoriaLogo, PencilIcon, TrashIcon, CheckIcon, LoadingSpinnerIcon, FilesIcon, SAFIcon, NewSessionIcon, ExportIcon } from './Icons';
import { useWorkspace } from '../context/WorkspaceContext';
import { SimulationCorePanel } from './SimulationCorePanel';

interface CanvasItemProps {
  canvas: Canvas;
  isActive: boolean;
}

const CanvasItem: React.FC<CanvasItemProps> = ({ canvas, isActive }) => {
    const { 
      selectCanvas, 
      deleteCanvas, 
      renameCanvas,
      initiateDelete,
      cancelDelete,
      isDeleting,
      pendingDeletionCanvasId
    } = useWorkspace();

    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(canvas.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const isPendingDeletion = pendingDeletionCanvasId === canvas.id;

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
    
    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        deleteCanvas(canvas.id);
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        cancelDelete();
    };
    
    const handleInitiateDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        initiateDelete(canvas.id);
    };

    const baseClasses = `flex justify-between items-center px-3 py-2 rounded-md cursor-pointer group transition-all duration-300 relative border`;
    const activeClasses = `bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_var(--glow-color)]`;
    const inactiveClasses = `text-cyan-200/70 border-transparent hover:bg-cyan-500/10`;
    const pendingDeleteClasses = `bg-red-500/20 border-red-500/50 text-red-300`;

    const getDynamicClasses = () => {
        if (isPendingDeletion) return pendingDeleteClasses;
        if (isActive) return activeClasses;
        return inactiveClasses;
    };

    return (
      <div
        onClick={() => !isRenaming && !isPendingDeletion && selectCanvas(canvas.id)}
        onDoubleClick={() => !isPendingDeletion && setIsRenaming(true)}
        className={`${baseClasses} ${getDynamicClasses()}`}
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
        ) : isPendingDeletion ? (
          <div className="flex justify-between items-center w-full">
            <span className="text-sm font-semibold animate-pulse">Delete?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelDelete}
                className="p-1 text-cyan-300/80 hover:text-cyan-200"
                aria-label="Cancel deletion"
                title="Cancel Deletion"
              >
                 ✕
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
                aria-label="Confirm deletion"
                title="Confirm Deletion"
              >
                {isDeleting ? <LoadingSpinnerIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="truncate pr-2 text-sm">{canvas.name}</span>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} 
                  className="p-1 mr-1 text-cyan-400/70 hover:text-cyan-300"
                  title="Rename Canvas"
                >
                    <PencilIcon className="w-3 h-3"/>
                </button>
                <button 
                    onClick={handleInitiateDelete} 
                    className="p-1 text-cyan-500/50 hover:text-red-400"
                    aria-label={`Delete ${canvas.name}`}
                    title="Delete Canvas"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
            </div>
          </>
        )}
      </div>
    );
};

const TabButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md transition-all ${
                isActive
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-inner shadow-cyan-900/50'
                    : 'text-cyan-400/70 hover:bg-cyan-500/10'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
};

export const FileExplorerPanel: React.FC = () => {
  const { canvases, activeCanvas, activeCanvasId, createCanvas } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'files' | 'core'>('files');
  
  const handleExport = () => {
    if (!activeCanvas) return;
    
    // For simplicity, we'll export only the text parts as a single markdown file.
    const content = activeCanvas.content
        .filter(part => part.type === 'text')
        .map(part => part.content)
        .join('\n\n---\n\n');

    const sanitizedName = (activeCanvas.name || 'canvas').replace(/[^a-z0-9._-]/gi, '_');
    const filename = `${sanitizedName}.md`;
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel w-full md:w-64 lg:w-72 p-0 flex flex-col shrink-0">
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center bg-slate-900/50 p-1 rounded-md border border-cyan-500/20">
          <TabButton
            icon={<FilesIcon className="w-4 h-4" />}
            label="Workspace"
            isActive={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
          />
          <TabButton
            icon={<SAFIcon className="w-4 h-4" />}
            label="Simulation Core"
            isActive={activeTab === 'core'}
            onClick={() => setActiveTab('core')}
          />
        </div>
      </div>
      
      {activeTab === 'files' && (
        <div className="px-4 py-4 flex flex-col flex-grow overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <button
                onClick={() => createCanvas()}
                title="Create a new blank canvas"
                className="flex-grow flex items-center justify-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium py-2 px-4 rounded-md transition-all text-sm"
              >
                <NewSessionIcon className="w-4 h-4" />
                New Canvas
            </button>
            <button
              onClick={handleExport}
              disabled={!activeCanvas}
              title="Export active canvas as Markdown"
              className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExportIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2">
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
      )}

      {activeTab === 'core' && (
        <div className="flex-grow overflow-hidden">
            <SimulationCorePanel onSimulationPrepared={() => setActiveTab('files')} />
        </div>
      )}
    </div>
  );
};