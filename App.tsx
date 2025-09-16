
import React from 'react';
import { ConfigErrorOverlay } from './components/ConfigErrorOverlay';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';
import { StatusBar } from './components/StatusBar';
import { useWorkspace } from './context/WorkspaceContext';
import { EldoriaLogo } from './components/Icons';

const SplashScreen: React.FC = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center splash-screen">
    <div className="animated-bg"></div>
    <div className="text-center">
      <EldoriaLogo className="w-24 h-24 text-cyan-400 logo" />
      <h1 className="text-4xl font-bold text-cyan-300 text-glow mt-4">Eldoria</h1>
      <p className="text-cyan-400/80 mt-2 animate-pulse">Initializing Agent Core...</p>
    </div>
  </div>
);

const Header: React.FC = () => (
    <header className="app-header bg-slate-900/50 border-b border-cyan-500/20 flex items-center justify-between px-4 z-10 backdrop-filter backdrop-blur-sm">
        <div className="flex items-center gap-3">
            <EldoriaLogo className="w-7 h-7 text-cyan-400 text-glow" />
            <h1 className="text-lg font-bold text-cyan-300 text-glow">
              Eldoria AI IDE
            </h1>
        </div>
    </header>
);

const App: React.FC = () => {
  const { isInitialized } = useWorkspace();

  if (!process.env.API_KEY) {
    return <ConfigErrorOverlay />;
  }
  
  if (!isInitialized) {
    return <SplashScreen />;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col">
      <div className="animated-bg"></div>
      <Header />
      <div className="ide-layout">
        <div className="main-content p-4 gap-4">
            <div className="opacity-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <FileExplorerPanel />
            </div>
            <div className="flex-grow flex flex-col md:flex-row h-full gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <EditorPanel />
              <OutputPanel />
            </div>
        </div>
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <StatusBar />
        </div>
      </div>
    </div>
  );
};

export default App;