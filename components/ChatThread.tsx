
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { UserIcon, ZenBotLogo, SendIcon } from './Icons';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatThreadProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
}

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && <ZenBotLogo className="w-7 h-7 text-cyan-400 shrink-0 mt-1" />}
            <div className={`w-full max-w-xl p-3 rounded-lg text-sm ${isUser ? 'bg-cyan-500/10 text-cyan-200' : 'bg-transparent'}`}>
                <MarkdownRenderer>{message.text}</MarkdownRenderer>
            </div>
            {isUser && <UserIcon className="w-7 h-7 text-cyan-200/80 shrink-0 mt-1" />}
        </div>
    );
};

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, isLoading, onSendMessage }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                {messages.map((msg, index) => (
                    <ChatBubble key={index} message={msg} />
                ))}
                 {isLoading && messages[messages.length - 1]?.sender === 'user' && (
                    <div className="flex items-start gap-3 my-4">
                        <ZenBotLogo className="w-7 h-7 text-cyan-400 shrink-0 mt-1 animate-pulse" />
                        <div className="w-full max-w-xl p-3 rounded-lg text-sm">
                           <div className="h-2 w-4 bg-cyan-400/50 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-2 pt-2 border-t border-cyan-500/20 shrink-0 flex items-center gap-2">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up question..."
                    rows={1}
                    className="flex-grow bg-cyan-900/50 border border-cyan-500/30 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none text-sm custom-scrollbar"
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-md disabled:opacity-50 transition-all">
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};