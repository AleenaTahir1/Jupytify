import { useMemo } from 'react';
import { Code, FileText } from 'lucide-react';

interface NotebookCell {
  cell_type: string;
  source: string | string[];
  outputs?: any[];
  execution_count?: number | null;
}

interface NotebookData {
  cells: NotebookCell[];
  metadata?: any;
}

interface NotebookPreviewProps {
  content: string | null;
  onCellEdit?: (cellIndex: number, newSource: string) => void;
  editable?: boolean;
}

export function NotebookPreview({ content, onCellEdit, editable = false }: NotebookPreviewProps) {
  const notebook = useMemo<NotebookData | null>(() => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No notebook loaded</p>
          <p className="text-sm">Upload a .ipynb file to preview</p>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="h-full flex items-center justify-center text-red-400">
        <p>Failed to parse notebook</p>
      </div>
    );
  }

  const getCellSource = (source: string | string[]): string => {
    return Array.isArray(source) ? source.join('') : source;
  };

  const renderOutput = (output: any, idx: number) => {
    if (output.output_type === 'stream') {
      const text = Array.isArray(output.text) ? output.text.join('') : output.text;
      return (
        <div key={idx} className="bg-gray-50 border-l-4 border-green-400 p-3 mt-2 text-sm font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap">{text}</pre>
        </div>
      );
    }
    if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
      if (output.data?.['image/png']) {
        return (
          <div key={idx} className="mt-2 flex justify-center">
            <img 
              src={`data:image/png;base64,${output.data['image/png'].replace(/\n/g, '')}`} 
              alt="Output" 
              className="max-w-full max-h-64 object-contain"
            />
          </div>
        );
      }
      if (output.data?.['text/html']) {
        const html = Array.isArray(output.data['text/html']) 
          ? output.data['text/html'].join('') 
          : output.data['text/html'];
        return (
          <div 
            key={idx} 
            className="mt-2 overflow-x-auto text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (output.data?.['text/plain']) {
        const text = Array.isArray(output.data['text/plain']) 
          ? output.data['text/plain'].join('') 
          : output.data['text/plain'];
        return (
          <div key={idx} className="bg-gray-50 p-3 mt-2 text-sm font-mono overflow-x-auto">
            <pre className="whitespace-pre-wrap">{text}</pre>
          </div>
        );
      }
    }
    if (output.output_type === 'error') {
      return (
        <div key={idx} className="bg-red-50 border-l-4 border-red-400 p-3 mt-2 text-sm font-mono text-red-700 overflow-x-auto">
          <pre className="whitespace-pre-wrap">{output.traceback?.join('\n') || output.evalue}</pre>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      {notebook.cells.map((cell, index) => (
        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Cell Header */}
          <div className="bg-gray-50 px-3 py-1.5 flex items-center gap-2 border-b border-gray-200">
            {cell.cell_type === 'code' ? (
              <>
                <Code className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500">
                  In [{cell.execution_count ?? ' '}]:
                </span>
              </>
            ) : cell.cell_type === 'markdown' ? (
              <>
                <FileText className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-gray-500">Markdown</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Raw</span>
              </>
            )}
          </div>

          {/* Cell Content */}
          <div className="p-3">
            {editable ? (
              <textarea
                className="w-full min-h-[80px] p-2 font-mono text-sm bg-white border border-gray-200 rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={getCellSource(cell.source)}
                onChange={(e) => onCellEdit?.(index, e.target.value)}
              />
            ) : (
              <pre className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {getCellSource(cell.source)}
              </pre>
            )}

            {/* Outputs */}
            {cell.outputs && cell.outputs.length > 0 && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {cell.outputs.map((output, idx) => renderOutput(output, idx))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
