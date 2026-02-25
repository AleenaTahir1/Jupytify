import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { Download, FolderOpen, RefreshCw, Edit3, Eye, Folder, Clock, Trash2 } from 'lucide-react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { DocumentTabs, type Document } from './components/DocumentTabs';
import { FileUpload } from './components/FileUpload';
import { ConversionProgress } from './components/ConversionProgress';
import { NotebookPreview } from './components/NotebookPreview';
import { PdfPreview } from './components/PdfPreview';

interface ConversionResult {
  pdf_path: string;
  html_path: string;
}

interface HistoryItem {
  id: string;
  fileName: string;
  pdfPath: string;
  convertedAt: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createNewDocument(): Document {
  return {
    id: generateId(),
    name: 'Untitled',
    file: null,
    status: 'idle',
    pdfPath: '',
    htmlPath: '',
    errorMessage: '',
    notebookContent: '',
    isEdited: false,
  };
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([createNewDocument()]);
  const [activeDocId, setActiveDocId] = useState(documents[0].id);
  const [activeView, setActiveView] = useState<'convert' | 'history' | 'settings' | 'help'>('convert');
  const [previewMode, setPreviewMode] = useState<'notebook' | 'pdf'>('notebook');
  const [isEditing, setIsEditing] = useState(false);
  const [defaultSavePath, setDefaultSavePath] = useState<string>('');
  const [autoOpenPdf, setAutoOpenPdf] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('jupytify-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    }
  }, []);

  // Save history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('jupytify-history', JSON.stringify(history));
  }, [history]);

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const content = await file.text();
    updateDocument(activeDocId, {
      file,
      name: file.name.replace('.ipynb', ''),
      status: 'idle',
      pdfPath: '',
      htmlPath: '',
      errorMessage: '',
      notebookContent: content,
      isEdited: false,
    });
  }, [activeDocId, updateDocument]);

  const handleClear = useCallback(() => {
    updateDocument(activeDocId, {
      file: null,
      name: 'Untitled',
      status: 'idle',
      pdfPath: '',
      htmlPath: '',
      errorMessage: '',
      notebookContent: '',
      isEdited: false,
    });
    setIsEditing(false);
  }, [activeDocId, updateDocument]);

  const handleCellEdit = useCallback((cellIndex: number, newSource: string) => {
    if (!activeDoc.notebookContent) return;
    try {
      const notebook = JSON.parse(activeDoc.notebookContent);
      notebook.cells[cellIndex].source = newSource.split('\n').map((line: string, i: number, arr: string[]) => 
        i < arr.length - 1 ? line + '\n' : line
      );
      updateDocument(activeDocId, {
        notebookContent: JSON.stringify(notebook, null, 2),
        isEdited: true,
      });
    } catch (e) {
      console.error('Failed to update cell:', e);
    }
  }, [activeDoc.notebookContent, activeDocId, updateDocument]);

  const handleConvert = useCallback(async () => {
    if (!activeDoc.notebookContent && !activeDoc.file) return;

    updateDocument(activeDocId, { status: 'converting', errorMessage: '' });

    try {
      // Use edited content if available, otherwise read from file
      let contentToConvert = activeDoc.notebookContent;
      if (!contentToConvert && activeDoc.file) {
        contentToConvert = await activeDoc.file.text();
      }
      
      const bytes = Array.from(new TextEncoder().encode(contentToConvert));
      
      const result = await invoke<ConversionResult>('convert_notebook', {
        notebookBytes: bytes,
        fileName: activeDoc.file?.name || 'notebook.ipynb',
      });

      updateDocument(activeDocId, { 
        pdfPath: result.pdf_path, 
        htmlPath: result.html_path,
        status: 'success',
        isEdited: false,
      });
      setPreviewMode('pdf');

      // Add to history
      const historyItem: HistoryItem = {
        id: generateId(),
        fileName: activeDoc.file?.name || 'notebook.ipynb',
        pdfPath: result.pdf_path,
        convertedAt: new Date().toISOString(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 49)]); // Keep last 50

      // Auto-open PDF if enabled
      if (autoOpenPdf && result.pdf_path) {
        await invoke('open_pdf_file', { path: result.pdf_path });
      }
    } catch (error) {
      updateDocument(activeDocId, {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }, [activeDoc, activeDocId, updateDocument, autoOpenPdf]);

  const handleDownload = useCallback(async () => {
    if (!activeDoc.pdfPath) return;

    try {
      const defaultName = activeDoc.file?.name.replace('.ipynb', '.pdf') || 'output.pdf';
      const savePath = await save({
        defaultPath: defaultSavePath ? `${defaultSavePath}/${defaultName}` : defaultName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (savePath) {
        await invoke('save_pdf', { sourcePath: activeDoc.pdfPath, destPath: savePath });
      }
    } catch (error) {
      console.error('Failed to save PDF:', error);
    }
  }, [activeDoc, defaultSavePath]);

  const handleBrowseSavePath = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Default Save Location',
      });
      if (selected && typeof selected === 'string') {
        setDefaultSavePath(selected);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  }, []);

  const handleAddDocument = useCallback(() => {
    const newDoc = createNewDocument();
    setDocuments(docs => [...docs, newDoc]);
    setActiveDocId(newDoc.id);
    setIsEditing(false);
  }, []);

  const handleCloseDocument = useCallback((id: string) => {
    setDocuments(docs => {
      const newDocs = docs.filter(d => d.id !== id);
      if (newDocs.length === 0) {
        const newDoc = createNewDocument();
        setActiveDocId(newDoc.id);
        return [newDoc];
      }
      if (activeDocId === id) {
        setActiveDocId(newDocs[newDocs.length - 1].id);
      }
      return newDocs;
    });
    setIsEditing(false);
  }, [activeDocId]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Document Tabs */}
          <DocumentTabs
            documents={documents}
            activeId={activeDocId}
            onSelect={setActiveDocId}
            onClose={handleCloseDocument}
            onAdd={handleAddDocument}
          />

          {/* Main Panel */}
          <div className="flex-1 overflow-hidden">
            {activeView === 'convert' && (
              <div className="h-full flex">
                {/* Left Panel - Upload & Controls */}
                <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-auto">
                  {/* Upload Area */}
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-blue-500" />
                      Select Notebook
                    </h2>
                    <FileUpload
                      onFileSelect={handleFileSelect}
                      selectedFile={activeDoc.file}
                      onClear={handleClear}
                    />
                  </div>

                  {/* Status */}
                  {activeDoc.status !== 'idle' && (
                    <div className="mb-4">
                      <ConversionProgress status={activeDoc.status} errorMessage={activeDoc.errorMessage} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-3">
                    {/* Show Convert button only if not yet converted or if edited */}
                    {(activeDoc.status !== 'success' || activeDoc.isEdited) && (
                      <button
                        onClick={handleConvert}
                        disabled={!activeDoc.notebookContent || activeDoc.status === 'converting'}
                        className={`
                          w-full py-2.5 px-4 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2
                          ${activeDoc.notebookContent && activeDoc.status !== 'converting'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        <RefreshCw className={`w-4 h-4 ${activeDoc.status === 'converting' ? 'animate-spin' : ''}`} />
                        {activeDoc.status === 'converting' ? 'Converting...' : activeDoc.isEdited ? 'Reconvert' : 'Convert to PDF'}
                      </button>
                    )}

                    {/* Show Download button after successful conversion */}
                    {activeDoc.status === 'success' && (
                      <button
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium bg-green-500 hover:bg-green-400 text-white transition-all text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Preview Tabs */}
                  <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setPreviewMode('notebook')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          previewMode === 'notebook' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        Notebook Preview
                      </button>
                      <button
                        onClick={() => setPreviewMode('pdf')}
                        disabled={!activeDoc.htmlPath}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          previewMode === 'pdf' 
                            ? 'bg-blue-100 text-blue-700' 
                            : activeDoc.htmlPath 
                              ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <FolderOpen className="w-4 h-4" />
                        PDF Preview
                      </button>
                    </div>

                    {/* Edit Button - Top Right of Preview */}
                    {activeDoc.notebookContent && previewMode === 'notebook' && (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isEditing 
                            ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        {isEditing ? 'Exit Edit Mode' : 'Edit'}
                      </button>
                    )}
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 overflow-hidden bg-gray-50">
                    {previewMode === 'notebook' ? (
                      <NotebookPreview 
                        content={activeDoc.notebookContent} 
                        onCellEdit={isEditing ? handleCellEdit : undefined}
                        editable={isEditing}
                      />
                    ) : (
                      <PdfPreview 
                        pdfPath={activeDoc.pdfPath} 
                        htmlPath={activeDoc.htmlPath}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'history' && (
              <div className="h-full overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Conversion History
                      </h2>
                      {history.length > 0 && (
                        <button
                          onClick={() => setHistory([])}
                          className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Clear All
                        </button>
                      )}
                    </div>
                    {history.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No conversions yet</p>
                        <p className="text-sm">Your converted files will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {history.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700 truncate">{item.fileName}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(item.convertedAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={async () => {
                                  try {
                                    const defaultName = item.fileName.replace('.ipynb', '.pdf');
                                    const savePath = await save({
                                      defaultPath: defaultSavePath ? `${defaultSavePath}/${defaultName}` : defaultName,
                                      filters: [{ name: 'PDF', extensions: ['pdf'] }],
                                    });
                                    if (savePath) {
                                      await invoke('save_pdf', { sourcePath: item.pdfPath, destPath: savePath });
                                    }
                                  } catch (e) {
                                    console.error('Failed to save:', e);
                                  }
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setHistory(prev => prev.filter(h => h.id !== item.id))}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove from history"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="h-full overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Settings</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-700">Output Quality</p>
                          <p className="text-sm text-gray-500">PDF resolution and quality</p>
                        </div>
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div>
                          <p className="font-medium text-gray-700">Default Save Location</p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">
                            {defaultSavePath || 'Not set - will ask each time'}
                          </p>
                        </div>
                        <button 
                          onClick={handleBrowseSavePath}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                        >
                          <Folder className="w-4 h-4" />
                          Browse...
                        </button>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-gray-700">Auto-open PDF</p>
                          <p className="text-sm text-gray-500">Open PDF after conversion</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={autoOpenPdf}
                            onChange={(e) => setAutoOpenPdf(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'help' && (
              <div className="h-full overflow-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-6">Help & About</h2>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-gray-700 mb-2">How to use Jupytify</h3>
                        <ol className="list-decimal list-inside text-gray-600 space-y-2 text-sm">
                          <li>Drag and drop a Jupyter notebook (.ipynb) file or click to browse</li>
                          <li>Preview and optionally edit the notebook content</li>
                          <li>Click "Convert to PDF" to generate the PDF</li>
                          <li>Preview the PDF and click "Download" to save</li>
                        </ol>
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                        <h3 className="font-medium text-gray-700 mb-2">Features</h3>
                        <ul className="text-gray-600 space-y-1 text-sm">
                          <li>• Edit notebook cells before conversion</li>
                          <li>• Preview both notebook and PDF</li>
                          <li>• Multiple documents with tabs</li>
                          <li>• Set default save location</li>
                        </ul>
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                        <h3 className="font-medium text-gray-700 mb-2">About</h3>
                        <p className="text-gray-600 text-sm">
                          Jupytify v0.1.0 - Convert Jupyter notebooks to beautifully formatted PDFs.
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                          Built with Tauri, React, and Rust.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
