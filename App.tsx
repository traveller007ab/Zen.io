
import React from 'react';
import { ConfigErrorOverlay } from './components/ConfigErrorOverlay';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';
import { StatusBar } from './components/StatusBar';

const App: React.FC = () => {
  if (!process.env.API_KEY) {
    return <ConfigErrorOverlay />;
  }

  return (
    <div className="relative h-screen w-screen">
      <div className="animated-bg"></div>
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