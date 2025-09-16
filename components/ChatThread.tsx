import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { UserIcon, EldoriaLogo, SendIcon, MicrophoneIcon, SpeakerOnIcon, SpeakerOffIcon } from './Icons';
import { MarkdownRenderer } from './MarkdownRenderer';

// A type guard for the SpeechRecognition API
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

interface ChatThreadProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string) => void;
}

interface ChatBubbleProps {
    message: ChatMessage;
    isSpeaking: boolean;
    onSpeak: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isSpeaking, onSpeak }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex items-start gap-3 my-4 group ${isUser ? 'justify-end' : ''}`}>
            {!isUser && <EldoriaLogo className="w-7 h-7 text-cyan-400 shrink-0 mt-1 text-glow" />}
            <div className={`w-full max-w-xl p-3 rounded-lg text-sm relative ${isUser ? 'bg-cyan-500/10 text-cyan-200' : 'bg-transparent'}`}>
                <MarkdownRenderer>{message.text}</MarkdownRenderer>
                 {!isUser && message.text && (
                    <button 
                        onClick={onSpeak}
                        className="absolute top-2 right-2 p-1 text-cyan-400/60 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={isSpeaking ? "Stop speaking" : "Read message aloud"}
                    >
                        {isSpeaking ? <SpeakerOnIcon className="w-4 h-4 text-cyan-300" /> : <SpeakerOffIcon className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {isUser && <UserIcon className="w-7 h-7 text-cyan-300/90 shrink-0 mt-1" />}
        </div>
    );
};

const WelcomeMessage = () => (
    <div className="text-center p-4 text-cyan-400/80 text-sm border border-cyan-500/20 rounded-lg bg-cyan-900/20 my-4 animate-fade-in">
        <EldoriaLogo className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
        <h3 className="font-semibold text-cyan-300 mb-2 text-glow">Welcome to the Eldoria AI IDE</h3>
        <p className="mb-3">
            This is your command console. I can guide you on how to use the AI agent.
        </p>
        <div className="text-left bg-cyan-900/50 p-3 rounded-md border border-cyan-500/30">
           <p className="font-bold text-cyan-200 mb-2">🚀 Your First Mission:</p>
           <p>The 'Quickstart' canvas is loaded in the editor. To see the AI agent in action, just press the <strong className="text-amber-300">⚡ Generate</strong> button.</p>
        </div>
    </div>
);

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, isLoading, onSendMessage }) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [jarvisVoice, setJarvisVoice] = useState<SpeechSynthesisVoice | null>(null);

    const recognitionRef = useRef<any>(null); // Using `any` for SpeechRecognition
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Setup Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result) => result.transcript)
                    .join('');
                setInput(transcript);
            };

            recognition.onend = () => {
                setIsListening(false);
            };
            
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Find and set a JARVIS-like voice
    useEffect(() => {
        const getVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;

            let bestVoice: SpeechSynthesisVoice | undefined;
            // Priority 1: High-quality Google British male voice
            bestVoice = voices.find(v => v.lang === 'en-GB' && v.name.includes('Google') && v.name.includes('Male'));
            // Priority 2: Any British male voice
            if (!bestVoice) {
                bestVoice = voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'));
            }
            // Priority 3: Any British voice
            if (!bestVoice) {
                bestVoice = voices.find(v => v.lang === 'en-GB');
            }
            // Priority 4: A decent US male voice as a fallback
            if (!bestVoice) {
                bestVoice = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male'));
            }
            
            if (bestVoice) {
                setJarvisVoice(bestVoice);
            }
        };
        
        getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = getVoices;
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            if (isListening) {
                recognitionRef.current?.stop();
            }
            window.speechSynthesis.cancel();
            setSpeakingMessageIndex(null);
            onSendMessage(input);
            setInput('');
        }
    };
    
    const handleToggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            setInput('');
            recognitionRef.current.start();
        }
        setIsListening(!isListening);
    };

    const handleSpeakMessage = (text: string, index: number) => {
        if (speakingMessageIndex === index) {
            window.speechSynthesis.cancel();
            setSpeakingMessageIndex(null);
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Apply the "JARVIS" voice and characteristics
        if (jarvisVoice) {
            utterance.voice = jarvisVoice;
        }
        utterance.pitch = 1; // A neutral, clear pitch
        utterance.rate = 1.1; // A faster, more efficient pace

        utterance.onend = () => setSpeakingMessageIndex(null);
        utterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            setSpeakingMessageIndex(null);
        };
        setSpeakingMessageIndex(index);
        window.speechSynthesis.speak(utterance);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto pr-2">
                {messages.length === 0 && !isLoading && <WelcomeMessage />}
                {messages.map((msg, index) => (
                    <ChatBubble 
                        key={index} 
                        message={msg} 
                        isSpeaking={speakingMessageIndex === index}
                        onSpeak={() => handleSpeakMessage(msg.text, index)}
                    />
                ))}
                 {isLoading && messages[messages.length - 1]?.sender === 'user' && (
                    <div className="flex items-start gap-3 my-4">
                        <EldoriaLogo className="w-7 h-7 text-cyan-400 shrink-0 mt-1 animate-pulse text-glow" />
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
                    placeholder={isListening ? "Listening..." : "Ask a follow-up question..."}
                    rows={1}
                    className="flex-grow bg-cyan-900/50 border border-cyan-500/30 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none text-sm"
                />
                <button 
                    onClick={handleToggleListening} 
                    disabled={!recognitionRef.current}
                    className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-md disabled:opacity-50 transition-all"
                    aria-label={isListening ? "Stop listening" : "Start listening"}
                >
                    <MicrophoneIcon className={`w-5 h-5 ${isListening ? 'animate-pulse-glow-mic' : ''}`} />
                </button>
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-md disabled:opacity-50 transition-all">
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};