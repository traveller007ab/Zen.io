
import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TaskPanel } from './TaskPanel';
import { ChatPanel } from './ChatPanel';
import { useWorkspace } from '../context/WorkspaceContext';
import { Source } from '../types';
import { EldoriaLogo } from './Icons';

const LoadingIndicator = () => (
    <div className="flex items-center justify-center h-full text-cyan-400">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="w-full h-16 bg-cyan-900/50 rounded-lg relative overflow-hidden border border-cyan-500/30">
                <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-[scanner_3s_infinite_ease-in-out]"></div>
            </div>
            <p className="text-glow animate-pulse">Engaging SAF Core...</p>
        </div>
        <style>{`
            @keyframes scanner {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);

const IdleOutputDisplay: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 border border-cyan-500/20 rounded-lg bg-cyan-900/20 max-w-md animate-fade-in">
            <EldoriaLogo className="w-12 h-12 mx-auto mb-4 text-cyan-400 text-glow" />
            <h3 className="text-xl font-bold text-cyan-300 mb-2 text-glow">Ready to Execute</h3>
            <p className="text-cyan-400/80 text-sm">
                The <span className="font-bold text-cyan-300">'Quickstart'</span> canvas is loaded in the editor.
                <br/>
                Press the <span className="font-bold text-cyan-300">⚡ Generate</span> button to watch the AI agent perform its task.
            </p>
        </div>
    </div>
);

const Sources: React.FC<{ sources: Source[] }> = ({ sources }) => (
    <div className="mt-6 pt-4 border-t border-cyan-500/20">
        <h4 className="text-sm font-semibold text-cyan-300 mb-2">Sources Consulted</h4>
        <div className="flex flex-col gap-2">
            {sources.map((source, index) => (
                <a 
                    key={index} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-cyan-400/80 hover:text-cyan-300 hover:underline truncate transition-colors"
                    title={source.uri}
                >
                    {`[${index + 1}] ${source.title}`}
                </a>
            ))}
        </div>
    </div>
);

type Tab = 'output' | 'task' | 'chat';

const TabButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 border-b-2 ${
                isActive
                    ? 'text-cyan-300 border-cyan-400 text-glow'
                    : 'text-cyan-400/60 border-transparent hover:bg-cyan-500/10 hover:text-cyan-300'
            }`}
        >
            {label}
        </button>
    );
};


export const OutputPanel: React.FC = () => {
    const { 
        activeCanvas, 
        isLoading,
        acceptOutput,
        appendOutput
    } = useWorkspace();
    
    const [activeTab, setActiveTab] = useState<Tab>('output');

    const hasOutput = !!activeCanvas?.output?.trim();
    const hasSources = !!activeCanvas?.output_sources && activeCanvas.output_sources.length > 0;

  return (
    <div className="panel w-full md:w-1/2 flex flex-col overflow-hidden">
        {/* Header with Tabs */}
        <div className="flex justify-between items-center border-b border-cyan-500/20 shrink-0 px-4">
            <div className="flex items-center gap-2">
                <TabButton label="Output" isActive={activeTab === 'output'} onClick={() => setActiveTab('output')} />
                <TabButton label="Task Log" isActive={activeTab === 'task'} onClick={() => setActiveTab('task')} />
                <TabButton label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
            </div>
            {hasOutput && !isLoading && activeTab === 'output' && (
                <div className="flex items-center gap-2">
                    <button 
                        onClick={appendOutput}
                        className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-md transition-colors"
                        title="Append output to the end of the editor content"
                    >
                        Append 
                    </button>
                    <button 
                        onClick={acceptOutput}
                        className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 px-2 py-1 rounded-md transition-colors"
                        title="Replace editor content with this output"
                    >
                        Accept & Replace
                    </button>
                </div>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-grow p-4 overflow-hidden">
            {activeTab === 'output' && (
                <div className="h-full overflow-y-auto pr-2">
                    {isLoading ? (
                        <LoadingIndicator />
                    ) : hasOutput ? (
                        <>
                            <MarkdownRenderer>
                                {activeCanvas?.output || ''}
                            </MarkdownRenderer>
                            {hasSources && <Sources sources={activeCanvas.output_sources!} />}
                        </>
                    ) : (
                        <IdleOutputDisplay />
                    )}
                </div>
            )}
            {activeTab === 'task' && (
                <TaskPanel
                    log={activeCanvas?.task_log || []}
                    isLoading={isLoading}
                />
            )}
            {activeTab === 'chat' && <ChatPanel />}
        </div>
    </div>
  );
};