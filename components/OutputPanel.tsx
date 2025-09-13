
import React from 'react';
import { Canvas } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChatThread } from './ChatThread';

interface OutputPanelProps {
  activeCanvas: Canvas | undefined;
  isLoading: boolean;
  isChatLoading: boolean;
  onSendChatMessage: (message: string) => void;
}

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


export const OutputPanel: React.FC<OutputPanelProps> = ({ activeCanvas, isLoading, isChatLoading, onSendChatMessage }) => {
  return (
    <div className="panel w-full md:w-1/2 flex flex-col overflow-hidden">
        {/* Main Output Section */}
        <div className="p-4 flex-grow relative flex flex-col h-1/2">
            <h2 className="text-lg font-semibold text-cyan-300 mb-2 pb-2 text-glow border-b border-cyan-500/20 shrink-0">Output</h2>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 relative">
                {isLoading && !activeCanvas?.output ? (
                    <LoadingIndicator />
                ) : (
                    <MarkdownRenderer>
                        {activeCanvas?.output || ''}
                    </MarkdownRenderer>
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
                onSendMessage={onSendChatMessage}
            />
        </div>
    </div>
  );
};