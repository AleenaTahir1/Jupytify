import { useState, useCallback } from 'react';
import { Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export function FileUpload({ onFileSelect, selectedFile, onClear }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.ipynb')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.ipynb')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  if (selectedFile) {
    return (
      <div className="bg-royal-soft border border-royal/20 rounded-xl p-4 relative group">
        <button
          onClick={onClear}
          className="absolute -top-2 -right-2 w-6 h-6 bg-crimson hover:bg-crimson/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          title="Clear file"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
        <div className="flex items-center gap-3">
          <div className="bg-royal/10 p-3 rounded-lg flex-shrink-0">
            <File className="w-5 h-5 text-royal" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-mute text-xs mt-0.5">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
        ${isDragging
          ? 'border-royal bg-royal-soft'
          : 'border-sand hover:border-royal/40 hover:bg-royal-soft/30'
        }
      `}
    >
      <input
        type="file"
        accept=".ipynb"
        onChange={handleFileInput}
        className="hidden"
        id="file-input"
      />
      <label htmlFor="file-input" className="cursor-pointer">
        <div className="w-14 h-14 bg-royal-soft rounded-full flex items-center justify-center mx-auto mb-3">
          <Upload className="w-6 h-6 text-royal" />
        </div>
        <p className="text-ink text-sm font-medium mb-1">
          Drop notebook here
        </p>
        <p className="text-mute text-xs">
          .ipynb files only
        </p>
      </label>
    </div>
  );
}
