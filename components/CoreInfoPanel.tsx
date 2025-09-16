import React from 'react';
import { ELDORIA_CORE_CONFIG } from '../constants';
import { EmeraldMindIcon, SAFIcon } from './Icons';

const Section: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
    <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
            {icon}
            <h2 className="text-lg font-bold text-cyan-300 text-glow">{title}</h2>
        </div>
        <p className="text-sm text-cyan-400/80 mb-4 pl-9">{description}</p>
        <div className="pl-9">{children}</div>
    </div>
);

const SAFDiagram = () => (
    <div className="relative my-4">
        <svg viewBox="0 0 400 280" className="w-full h-auto drop-shadow-[0_0_8px_var(--glow-color)]">
            {/* Lines */}
            <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: 'rgba(6, 182, 212, 0.1)', stopOpacity: 1 }} />
                    <stop offset="50%" style={{ stopColor: 'rgba(6, 182, 212, 0.8)', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: 'rgba(6, 182, 212, 0.1)', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            
            {/* Connections from Core */}
            <path d="M 160 140 Q 120 100 80 80" stroke="url(#line-grad)" strokeWidth="1.5" fill="none" />
            <path d="M 160 140 Q 120 180 80 200" stroke="url(#line-grad)" strokeWidth="1.5" fill="none" />
            <path d="M 240 140 Q 280 100 320 80" stroke="url(#line-grad)" strokeWidth="1.5" fill="none" />
            <path d="M 240 140 Q 280 180 320 200" stroke="url(#line-grad)" strokeWidth="1.5" fill="none" />
            <path d="M 200 165 v 55" stroke="url(#line-grad)" strokeWidth="1.5" fill="none" />


            {/* Central Node */}
            <g className="opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <rect x="150" y="115" width="100" height="50" rx="5" fill="rgba(6, 182, 212, 0.2)" stroke="rgba(6, 182, 212, 0.6)" />
                <text x="200" y="142.5" textAnchor="middle" fill="#e0f2fe" fontSize="11" className="font-semibold">Engine Core</text>
            </g>
            
            {/* Leaf Nodes */}
            <g className="opacity-0 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <rect x="30" y="60" width="100" height="40" rx="5" fill="rgba(14, 38, 82, 0.7)" stroke="rgba(6, 182, 212, 0.4)" />
                <text x="80" y="82.5" textAnchor="middle" fill="#c7d2fe" fontSize="10">Math Engine</text>
            </g>
             <g className="opacity-0 animate-fade-in" style={{ animationDelay: '400ms' }}>
                <rect x="30" y="180" width="100" height="40" rx="5" fill="rgba(14, 38, 82, 0.7)" stroke="rgba(6, 182, 212, 0.4)" />
                <text x="80" y="202.5" textAnchor="middle" fill="#c7d2fe" fontSize="10">Logic Engine</text>
            </g>
             <g className="opacity-0 animate-fade-in" style={{ animationDelay: '500ms' }}>
                <rect x="270" y="60" width="100" height="40" rx="5" fill="rgba(14, 38, 82, 0.7)" stroke="rgba(6, 182, 212, 0.4)" />
                <text x="320" y="82.5" textAnchor="middle" fill="#c7d2fe" fontSize="10">Visualization</text>
            </g>
            <g className="opacity-0 animate-fade-in" style={{ animationDelay: '600ms' }}>
                <rect x="270" y="180" width="100" height="40" rx="5" fill="rgba(14, 38, 82, 0.7)" stroke="rgba(6, 182, 212, 0.4)" />
                <text x="320" y="202.5" textAnchor="middle" fill="#c7d2fe" fontSize="10">Integration</text>
            </g>
             <g className="opacity-0 animate-fade-in" style={{ animationDelay: '700ms' }}>
                <rect x="150" y="220" width="100" height="40" rx="5" fill="rgba(14, 38, 82, 0.7)" stroke="rgba(6, 182, 212, 0.4)" />
                <text x="200" y="242.5" textAnchor="middle" fill="#c7d2fe" fontSize="10">Data Types</text>
            </g>
        </svg>
    </div>
);

const DetailList: React.FC<{ items: string[] }> = ({ items }) => (
    <ul className="space-y-2">
        {items.map((item, index) => (
            <li key={index} className="flex items-start">
                <span className="text-cyan-400 mr-2 mt-1">▹</span>
                <span className="text-sky-300/90 text-sm">{item}</span>
            </li>
        ))}
    </ul>
);

export const CoreInfoPanel: React.FC = () => {
  const { EmeraldMind, SAF } = ELDORIA_CORE_CONFIG.core;
  
  return (
    <div className="h-full flex flex-col p-4">
        <div className="flex-grow overflow-y-auto pr-2">
            <Section 
                icon={<EmeraldMindIcon className="w-6 h-6 text-cyan-400 text-glow" />}
                title="EmeraldMind"
                description={EmeraldMind.description}
            >
                <h3 className="text-md font-semibold text-cyan-300 mb-2">Capabilities</h3>
                <DetailList items={EmeraldMind.capabilities} />
            </Section>

            <Section 
                icon={<SAFIcon className="w-6 h-6 text-cyan-400 text-glow animate-spin" style={{ animationDuration: '10s' }} />}
                title="SAF"
                description={SAF.description}
            >
                <h3 className="text-md font-semibold text-cyan-300 mb-2">Architecture</h3>
                <SAFDiagram />
            </Section>

            <div className="mt-6 pt-4 border-t border-cyan-500/20">
                <h2 className="text-lg font-bold text-cyan-300 text-glow mb-2">System Vision</h2>
                <blockquote className="border-l-2 border-cyan-500/50 pl-4 italic text-cyan-200/80 text-sm">
                    {ELDORIA_CORE_CONFIG.vision}
                </blockquote>
            </div>
        </div>
    </div>
  );
};
