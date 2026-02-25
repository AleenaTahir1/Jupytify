import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
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
    return (
      <div className="h-full overflow-hidden">
        <iframe
          srcDoc={htmlContent}
          className="w-full h-full border-0 bg-white"
          title="PDF Preview"
          sandbox="allow-same-origin"
        />
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
