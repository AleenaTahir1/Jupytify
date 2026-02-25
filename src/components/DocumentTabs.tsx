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
    <div className="flex items-center bg-snow border-b border-sand px-2 overflow-x-auto">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className={`
            group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b-2 transition-all min-w-0
            ${activeId === doc.id
              ? 'border-royal text-ink bg-royal-soft/40'
              : 'border-transparent text-dim hover:text-ink hover:bg-pearl'
            }
          `}
          onClick={() => onSelect(doc.id)}
        >
          <span className="truncate max-w-[140px] text-[13px] font-medium">
            {doc.name}
          </span>
          {doc.status === 'converting' && (
            <div className="w-2 h-2 bg-royal rounded-full animate-pulse flex-shrink-0" />
          )}
          {doc.status === 'success' && (
            <div className="w-2 h-2 bg-clover rounded-full flex-shrink-0" />
          )}
          {doc.status === 'error' && (
            <div className="w-2 h-2 bg-crimson rounded-full flex-shrink-0" />
          )}
          {documents.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(doc.id);
              }}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-sand transition-all"
            >
              <X className="w-3 h-3 text-mute" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="p-2 text-mute hover:text-ink hover:bg-pearl rounded-md transition-all ml-1"
        title="New Document"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
