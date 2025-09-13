import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChatThread } from './ChatThread';
import { useWorkspace } from '../context/WorkspaceContext';
import { Source } from '../types';

const LoadingIndicator = () => (
    <div className="flex items-center justify-center h-full text-cyan-400">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="w-full h-16 bg-cyan-900/50 rounded-lg relative overflow-hidden border border-cyan-500/30">
                <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-[scanner_3s_infinite_ease-in-out]"></div>
            </div>
            <p className="text-glow animate-pulse">Constructing Response...</p>
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


export const OutputPanel: React.FC = () => {
    const { 
        activeCanvas, 
        isLoading, 
        isChatLoading, 
        sendChatMessage,
        acceptOutput,
        appendOutput
    } = useWorkspace();

    const hasOutput = !!activeCanvas?.output?.trim();
    const hasSources = !!activeCanvas?.output_sources && activeCanvas.output_sources.length > 0;

  return (
    <div className="panel w-full md:w-1/2 flex flex-col overflow-hidden">
        {/* Main Output Section */}
        <div className="p-4 flex-grow relative flex flex-col h-1/2">
            <div className="flex justify-between items-center mb-2 pb-2 text-glow border-b border-cyan-500/20 shrink-0">
                <h2 className="text-lg font-semibold text-cyan-300">Output</h2>
                {hasOutput && !isLoading && (
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
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 relative">
                {isLoading && !activeCanvas?.output ? (
                    <LoadingIndicator />
                ) : (
                    <>
                        <MarkdownRenderer>
                            {activeCanvas?.output || ''}
                        </MarkdownRenderer>
                        {hasSources && <Sources sources={activeCanvas.output_sources!} />}
                    </>
                )}
            </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-cyan-500/20 shrink-0"></div>

        {/* Chat Thread Section */}
        <div className="p-4 flex-grow relative flex flex-col h-1/2">
            <h2 className="text-lg font-semibold text-cyan-300 mb-2 pb-2 text-glow border-b border-cyan-500/20 shrink-0">Conversation</h2>
            <ChatThread
                messages={activeCanvas?.chat_history || []}
                isLoading={isChatLoading}
                onSendMessage={sendChatMessage}
            />
        </div>
    </div>
  );
};