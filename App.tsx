
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
            <FileExplorerPanel />
            <div className="flex-grow flex flex-col md:flex-row h-full gap-4">
              <EditorPanel />
              <OutputPanel />
            </div>
        </div>
        <StatusBar />
      </div>
    </div>
  );
};

export default App;