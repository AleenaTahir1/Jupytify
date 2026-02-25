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
    // Open the PDF file instead of HTML
    if (pdfPath) {
      try {
        await invoke('open_pdf_file', { path: pdfPath });
      } catch (err) {
        console.error('Failed to open PDF in browser:', err);
      }
    }
  };

  if (!pdfPath && !htmlPath) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No PDF generated yet</p>
          <p className="text-sm">Convert a notebook to see preview</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading preview...</p>
        </div>
      </div>
    );
  }

  if (htmlContent) {
    // Inject CSS for proper display - allow scrolling within iframe
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
      <div className="h-full flex flex-col overflow-hidden bg-gray-200">
        {/* Open in Browser button */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex justify-end">
          <button
            onClick={handleOpenInBrowser}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Browser
          </button>
        </div>
        {/* PDF-like preview with proper scrolling */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
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
    <div className="h-full flex items-center justify-center text-gray-400">
      <div className="text-center">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>PDF generated successfully</p>
        <p className="text-sm">Click Download to save</p>
      </div>
    </div>
  );
}
