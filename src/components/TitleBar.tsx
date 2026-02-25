import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    const maximized = await window.isMaximized();
    if (maximized) {
      await window.unmaximize();
      setIsMaximized(false);
    } else {
      await window.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  return (
    <div 
      data-tauri-drag-region 
      className="h-10 bg-white border-b border-gray-200 flex items-center justify-between px-3 select-none"
    >
      {/* Logo and Title */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <img src="/logo.svg" alt="Jupytify" className="w-6 h-6" />
        <span className="text-gray-700 font-semibold text-sm" data-tauri-drag-region>
          Jupytify
        </span>
      </div>

      {/* Spacer for drag region */}
      <div className="flex-1" data-tauri-drag-region />

      {/* Window Controls */}
      <div className="flex items-center">
        <button
          onClick={handleMinimize}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
          title="Minimize"
        >
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5 text-gray-600" />
          ) : (
            <Square className="w-3.5 h-3.5 text-gray-600" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors group"
          title="Close"
        >
          <X className="w-4 h-4 text-gray-600 group-hover:text-white" />
        </button>
      </div>
    </div>
  );
}
