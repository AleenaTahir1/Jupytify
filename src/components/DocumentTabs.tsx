import { X, Plus } from 'lucide-react';

export interface Document {
  id: string;
  name: string;
  file: File | null;
  status: 'idle' | 'converting' | 'success' | 'error';
  pdfPath: string;
  htmlPath: string;
  errorMessage: string;
  notebookContent: string;
  isEdited: boolean;
}

interface DocumentTabsProps {
  documents: Document[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}

export function DocumentTabs({ documents, activeId, onSelect, onClose, onAdd }: DocumentTabsProps) {
  return (
    <div className="flex items-center bg-gray-50 border-b border-gray-200 px-2 overflow-x-auto">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`
            flex items-center gap-2 px-4 py-2 cursor-pointer border-b-2 transition-all min-w-0
            ${activeId === doc.id 
              ? 'bg-white border-blue-500 text-gray-800' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }
          `}
          onClick={() => onSelect(doc.id)}
        >
          <span className="truncate max-w-[150px] text-sm font-medium">
            {doc.name}
          </span>
          {doc.status === 'converting' && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
          {doc.status === 'success' && (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          )}
          {doc.status === 'error' && (
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          )}
          {documents.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(doc.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="p-2 hover:bg-gray-100 rounded transition-colors ml-1"
        title="New Document"
      >
        <Plus className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
