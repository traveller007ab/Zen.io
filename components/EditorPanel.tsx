import React, { useRef, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { processImageFile, processTextFile } from '../utils/imageUtils';
import { EditableTextPart } from './EditableTextPart';
import { ImagePart } from './ImagePart';
import { PaperclipIcon } from './Icons';

export const EditorPanel: React.FC = () => {
  const { activeCanvas, addCanvasPart, generate, isLoading } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !activeCanvas) return;
    
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        try {
          const { dataUri, mimeType } = await processImageFile(file);
          addCanvasPart(activeCanvas.id, { type: 'image', content: dataUri, mimeType });
        } catch (error) {
          console.error("Error processing image file:", error);
          const errorMessage = `\n\n[Error processing image: ${file.name}]`;
          addCanvasPart(activeCanvas.id, { type: 'text', content: errorMessage });
        }
      } else if (file.type.startsWith('text/') || /\.(txt|md|js|jsx|ts|tsx|json|css|html|py|rb|java|c|cpp|cs|go|php|rs|swift|kt|sh)$/.test(file.name)) {
        try {
          const textContent = await processTextFile(file);
          const formattedContent = `\n\n\`\`\`${file.name}\n${textContent}\n\`\`\``;
          addCanvasPart(activeCanvas.id, { type: 'text', content: formattedContent });
        } catch (error) {
           console.error("Error processing text file:", error);
           const errorMessage = `\n\n[Error reading text file: ${file.name}]`;
           addCanvasPart(activeCanvas.id, { type: 'text', content: errorMessage });
        }
      } else {
        const unsupportedMessage = `\n\n[Unsupported file type: ${file.name} (${file.type})]`;
        addCanvasPart(activeCanvas.id, { type: 'text', content: unsupportedMessage });
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files);
    event.target.value = ''; // Reset file input to allow re-uploading the same file
  };
  
  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    let handled = false;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file && activeCanvas) {
            event.preventDefault();
            handled = true;
            const { dataUri, mimeType } = await processImageFile(file);
            addCanvasPart(activeCanvas.id, { type: 'image', content: dataUri, mimeType });
        }
      }
    }
    if (!handled && event.clipboardData.files.length > 0) {
        event.preventDefault();
        handleFiles(event.clipboardData.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
  };

  const canGenerate = activeCanvas && activeCanvas.content && activeCanvas.content.some(part => (part.type === 'text' && part.content.trim()) || part.type === 'image');

  return (
    <div 
      className="panel w-full md:w-1/2 flex flex-col relative"
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-cyan-900/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-cyan-400 rounded-lg pointer-events-none">
          <div className="text-center">
            <p className="text-xl font-bold text-cyan-300 text-glow">Drop Files Here</p>
            <p className="text-cyan-400/80">Supports images and text files</p>
          </div>
        </div>
      )}
      <div className="flex-grow p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-cyan-300 text-glow">Editor</h2>
              <button
                onClick={handleAttachClick}
                className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-md transition-colors flex items-center gap-2"
                title="Attach files"
              >
                <PaperclipIcon className="w-4 h-4" />
                <span>Attach File</span>
              </button>
              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
              />
            </div>
            <button
                onClick={generate}
                disabled={isLoading || !canGenerate}
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
        <div className="w-full h-full pr-2 overflow-y-auto">
            {activeCanvas?.content?.map((part, index) => {
                if (part.type === 'text') {
                    return <EditableTextPart key={index} part={part} partIndex={index} />;
                }
                if (part.type === 'image') {
                    return <ImagePart key={index} part={part} partIndex={index} />;
                }
                return null;
            })}
        </div>
      </div>
    </div>
  );
};