import { useState, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PdfPreviewProps {
  pdfPath: string | null;
  htmlPath?: string | null;
}

export function PdfPreview({ pdfPath, htmlPath }: PdfPreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (htmlPath) {
      setLoading(true);
      invoke<string>('read_html_file', { path: htmlPath })
        .then(content => {
          setHtmlContent(content);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to read HTML:', err);
          setLoading(false);
        });
    } else {
      setHtmlContent(null);
    }
  }, [htmlPath]);

  const handleOpenInBrowser = async () => {
    if (pdfPath) {
      try {
        await invoke('open_pdf_file', { path: pdfPath });
      } catch (err) {
        console.error('Failed to open PDF:', err);
      }
    }
  };

  if (!pdfPath && !htmlPath) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-clay" />
          <p className="text-dim text-sm font-medium">No PDF yet</p>
          <p className="text-mute text-xs mt-1">Convert a notebook to preview</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-royal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-dim text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (htmlContent) {
    const modifiedContent = htmlContent.replace(
      '</head>',
      `<style>
        html, body {
          margin: 0 !important;
          padding: 20px !important;
          box-sizing: border-box !important;
          background: white !important;
        }
      </style></head>`
    );

    return (
      <div className="h-full flex flex-col overflow-hidden bg-pearl">
        <div className="flex-shrink-0 bg-snow border-b border-sand px-4 py-2 flex justify-end">
          <button
            onClick={handleOpenInBrowser}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-royal hover:bg-royal-soft rounded-md transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Browser
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-5">
          <div className="h-full max-w-4xl mx-auto bg-white rounded-lg overflow-hidden shadow-xl shadow-black/8 border border-sand/50">
            <iframe
              srcDoc={modifiedContent}
              className="w-full h-full border-0 bg-white"
              title="PDF Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <FileText className="w-10 h-10 mx-auto mb-3 text-clay" />
        <p className="text-dim text-sm font-medium">PDF generated</p>
        <p className="text-mute text-xs mt-1">Click Download to save</p>
      </div>
    </div>
  );
}
