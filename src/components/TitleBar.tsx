import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-11 bg-snow border-b border-sand flex items-center justify-between px-4 select-none"
    >
      <div className="flex items-center gap-2.5" data-tauri-drag-region>
        <img src="/logo.svg" alt="Jupytify" className="w-5 h-5" />
        <span className="text-ink font-semibold text-[13px] tracking-wide" data-tauri-drag-region>
          Jupytify
        </span>
      </div>

      <div className="flex-1" data-tauri-drag-region />

      <div className="flex items-center -mr-1">
        <button
          onClick={handleMinimize}
          className="w-11 h-11 flex items-center justify-center text-mute hover:text-ink hover:bg-pearl transition-colors"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-11 h-11 flex items-center justify-center text-mute hover:text-ink hover:bg-pearl transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleClose}
          className="w-11 h-11 flex items-center justify-center text-mute hover:text-white hover:bg-crimson transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
