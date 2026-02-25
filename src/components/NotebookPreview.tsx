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
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-clay" />
          <p className="text-dim text-sm font-medium">No notebook loaded</p>
          <p className="text-mute text-xs mt-1">Upload a .ipynb file to preview</p>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-crimson text-sm">Failed to parse notebook</p>
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
        <div key={idx} className="bg-clover-soft border-l-3 border-clover/30 p-3 mt-2 text-xs font-mono overflow-x-auto rounded-r">
          <pre className="whitespace-pre-wrap text-ink/80">{text}</pre>
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
              className="max-w-full max-h-64 object-contain rounded"
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
            className="mt-2 overflow-x-auto text-xs bg-pearl rounded p-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (output.data?.['text/plain']) {
        const text = Array.isArray(output.data['text/plain'])
          ? output.data['text/plain'].join('')
          : output.data['text/plain'];
        return (
          <div key={idx} className="bg-pearl p-3 mt-2 text-xs font-mono overflow-x-auto rounded">
            <pre className="whitespace-pre-wrap text-ink/70">{text}</pre>
          </div>
        );
      }
    }
    if (output.output_type === 'error') {
      return (
        <div key={idx} className="bg-crimson-soft border-l-3 border-crimson/30 p-3 mt-2 text-xs font-mono text-crimson/80 overflow-x-auto rounded-r">
          <pre className="whitespace-pre-wrap">{output.traceback?.join('\n') || output.evalue}</pre>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {notebook.cells.map((cell, index) => (
        <div key={index} className="bg-snow border border-sand/80 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-pearl px-3 py-1.5 flex items-center gap-2 border-b border-sand/60">
            {cell.cell_type === 'code' ? (
              <>
                <Code className="w-3.5 h-3.5 text-royal" />
                <span className="text-[11px] text-dim font-mono">
                  In [{cell.execution_count ?? ' '}]
                </span>
              </>
            ) : cell.cell_type === 'markdown' ? (
              <>
                <FileText className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] text-dim">Markdown</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5 text-mute" />
                <span className="text-[11px] text-dim">Raw</span>
              </>
            )}
          </div>

          <div className="p-3">
            {editable ? (
              <textarea
                className="w-full min-h-[80px] p-2 font-mono text-xs bg-pearl border border-sand rounded resize-y text-ink focus:outline-none focus:border-royal/40 focus:ring-1 focus:ring-royal/20"
                value={getCellSource(cell.source)}
                onChange={(e) => onCellEdit?.(index, e.target.value)}
              />
            ) : (
              <pre className="font-mono text-xs whitespace-pre-wrap overflow-x-auto text-ink/80">
                {getCellSource(cell.source)}
              </pre>
            )}

            {cell.outputs && cell.outputs.length > 0 && (
              <div className="mt-3 border-t border-sand/40 pt-3">
                {cell.outputs.map((output, idx) => renderOutput(output, idx))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
