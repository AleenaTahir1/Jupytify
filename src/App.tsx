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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        relative w-10 h-[22px] rounded-full transition-colors duration-200
        ${checked ? 'bg-royal' : 'bg-clay'}
      `}
    >
      <div
        className={`
          absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm
          transition-transform duration-200
          ${checked ? 'translate-x-[18px]' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

function App() {
  const [documents, setDocuments] = useState<Document[]>([createNewDocument()]);
  const [activeDocId, setActiveDocId] = useState(documents[0].id);
  const [activeView, setActiveView] = useState<'convert' | 'history' | 'settings' | 'help'>('convert');
  const [previewMode, setPreviewMode] = useState<'notebook' | 'pdf'>('notebook');
  const [isEditing, setIsEditing] = useState(false);
  const [defaultSavePath, setDefaultSavePath] = useState<string>(() => {
    return localStorage.getItem('jupytify-defaultSavePath') || '';
  });
  const [autoOpenPdf, setAutoOpenPdf] = useState(() => {
    return localStorage.getItem('jupytify-autoOpenPdf') === 'true';
  });
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>(() => {
    return (localStorage.getItem('jupytify-pdfOrientation') as 'portrait' | 'landscape') || 'portrait';
  });
  const [pdfTheme, setPdfTheme] = useState<'light' | 'dark' | 'solarized'>(() => {
    return (localStorage.getItem('jupytify-pdfTheme') as 'light' | 'dark' | 'solarized') || 'light';
  });
  const [codeTheme, setCodeTheme] = useState<'default' | 'monokai' | 'github' | 'vscode-dark'>(() => {
    return (localStorage.getItem('jupytify-codeTheme') as 'default' | 'monokai' | 'github' | 'vscode-dark') || 'default';
  });
  const [pdfAuthor, setPdfAuthor] = useState(() => {
    return localStorage.getItem('jupytify-pdfAuthor') || '';
  });
  const [showDateHeader, setShowDateHeader] = useState(() => {
    return localStorage.getItem('jupytify-showDateHeader') === 'true';
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('jupytify-history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error('Failed to load history:', e); }
    }
  }, []);

  useEffect(() => { localStorage.setItem('jupytify-history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('jupytify-defaultSavePath', defaultSavePath); }, [defaultSavePath]);
  useEffect(() => { localStorage.setItem('jupytify-autoOpenPdf', autoOpenPdf.toString()); }, [autoOpenPdf]);
  useEffect(() => { localStorage.setItem('jupytify-pdfOrientation', pdfOrientation); }, [pdfOrientation]);
  useEffect(() => { localStorage.setItem('jupytify-pdfTheme', pdfTheme); }, [pdfTheme]);
  useEffect(() => { localStorage.setItem('jupytify-codeTheme', codeTheme); }, [codeTheme]);
  useEffect(() => { localStorage.setItem('jupytify-pdfAuthor', pdfAuthor); }, [pdfAuthor]);
  useEffect(() => { localStorage.setItem('jupytify-showDateHeader', showDateHeader.toString()); }, [showDateHeader]);

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  // Reset preview state when switching tabs
  useEffect(() => {
    setIsEditing(false);
    const doc = documents.find(d => d.id === activeDocId);
    setPreviewMode(doc?.htmlPath ? 'pdf' : 'notebook');
  }, [activeDocId]);

  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const content = await file.text();
    updateDocument(activeDocId, { file, name: file.name.replace('.ipynb', ''), status: 'idle', pdfPath: '', htmlPath: '', errorMessage: '', notebookContent: content, isEdited: false });
  }, [activeDocId, updateDocument]);

  const handleClear = useCallback(() => {
    updateDocument(activeDocId, { file: null, name: 'Untitled', status: 'idle', pdfPath: '', htmlPath: '', errorMessage: '', notebookContent: '', isEdited: false });
    setIsEditing(false);
  }, [activeDocId, updateDocument]);

  const handleCellEdit = useCallback((cellIndex: number, newSource: string) => {
    if (!activeDoc.notebookContent) return;
    try {
      const notebook = JSON.parse(activeDoc.notebookContent);
      notebook.cells[cellIndex].source = newSource.split('\n').map((line: string, i: number, arr: string[]) =>
        i < arr.length - 1 ? line + '\n' : line
      );
      updateDocument(activeDocId, { notebookContent: JSON.stringify(notebook, null, 2), isEdited: true });
    } catch (e) { console.error('Failed to update cell:', e); }
  }, [activeDoc.notebookContent, activeDocId, updateDocument]);

  const handleConvert = useCallback(async () => {
    if (!activeDoc.notebookContent && !activeDoc.file) return;
    updateDocument(activeDocId, { status: 'converting', errorMessage: '' });
    try {
      let contentToConvert = activeDoc.notebookContent;
      if (!contentToConvert && activeDoc.file) { contentToConvert = await activeDoc.file.text(); }
      const bytes = Array.from(new TextEncoder().encode(contentToConvert));
      const result = await invoke<ConversionResult>('convert_notebook', {
        notebookBytes: bytes, fileName: activeDoc.file?.name || 'notebook.ipynb',
        options: { orientation: pdfOrientation, theme: pdfTheme, code_theme: codeTheme, author: pdfAuthor, show_date: showDateHeader },
      });
      updateDocument(activeDocId, { pdfPath: result.pdf_path, htmlPath: result.html_path, status: 'success', isEdited: false });
      setPreviewMode('pdf');
      setHistory(prev => [{ id: generateId(), fileName: activeDoc.file?.name || 'notebook.ipynb', pdfPath: result.pdf_path, convertedAt: new Date().toISOString() }, ...prev.slice(0, 49)]);
      if (autoOpenPdf && result.pdf_path) { await invoke('open_pdf_file', { path: result.pdf_path }); }
    } catch (error) {
      updateDocument(activeDocId, { status: 'error', errorMessage: error instanceof Error ? error.message : String(error) });
    }
  }, [activeDoc, activeDocId, updateDocument, autoOpenPdf, pdfOrientation, pdfTheme, codeTheme, pdfAuthor, showDateHeader]);

  const handleDownload = useCallback(async () => {
    if (!activeDoc.pdfPath) return;
    try {
      const defaultName = activeDoc.file?.name.replace('.ipynb', '.pdf') || 'output.pdf';
      const savePath = await save({ defaultPath: defaultSavePath ? `${defaultSavePath}/${defaultName}` : defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
      if (savePath) { await invoke('save_pdf', { sourcePath: activeDoc.pdfPath, destPath: savePath }); }
    } catch (error) { console.error('Failed to save PDF:', error); }
  }, [activeDoc, defaultSavePath]);

  const handleBrowseSavePath = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false, title: 'Select Default Save Location' });
      if (selected && typeof selected === 'string') { setDefaultSavePath(selected); }
    } catch (error) { console.error('Failed to select folder:', error); }
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
      if (newDocs.length === 0) { const newDoc = createNewDocument(); setActiveDocId(newDoc.id); return [newDoc]; }
      if (activeDocId === id) { setActiveDocId(newDocs[newDocs.length - 1].id); }
      return newDocs;
    });
    setIsEditing(false);
  }, [activeDocId]);

  return (
    <div className="h-screen flex flex-col bg-pearl overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DocumentTabs documents={documents} activeId={activeDocId} onSelect={setActiveDocId} onClose={handleCloseDocument} onAdd={handleAddDocument} />

          <div className="flex-1 overflow-hidden">
            {activeView === 'convert' && (
              <div className="h-full flex">
                {/* Left Panel */}
                <div className="w-80 flex-shrink-0 border-r border-sand bg-snow p-5 overflow-auto">
                  <div className="mb-5">
                    <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-3 flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-royal" />
                      Select Notebook
                    </h2>
                    <FileUpload onFileSelect={handleFileSelect} selectedFile={activeDoc.file} onClear={handleClear} />
                  </div>

                  {(activeDoc.status === 'success' || activeDoc.status === 'error') && (
                    <div className="mb-5">
                      <ConversionProgress status={activeDoc.status} errorMessage={activeDoc.errorMessage} />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {(activeDoc.status !== 'success' || activeDoc.isEdited) && (
                      <button
                        onClick={handleConvert}
                        disabled={!activeDoc.notebookContent || activeDoc.status === 'converting'}
                        className={`
                          w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
                          ${activeDoc.notebookContent && activeDoc.status !== 'converting'
                            ? 'bg-royal hover:bg-royal-deep text-white cursor-pointer shadow-md shadow-royal/25'
                            : 'bg-pearl text-mute cursor-not-allowed border border-sand'
                          }
                        `}
                      >
                        <RefreshCw className={`w-4 h-4 ${activeDoc.status === 'converting' ? 'animate-spin' : ''}`} />
                        {activeDoc.status === 'converting' ? 'Converting...' : activeDoc.isEdited ? 'Reconvert' : 'Convert to PDF'}
                      </button>
                    )}

                    {activeDoc.status === 'success' && (
                      <button
                        onClick={handleDownload}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium bg-clover hover:bg-clover/90 text-white transition-all text-sm shadow-md shadow-clover/25"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-snow border-b border-sand px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewMode('notebook')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          previewMode === 'notebook'
                            ? 'bg-royal-pale text-royal-deep'
                            : 'text-dim hover:text-ink hover:bg-pearl'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Notebook
                      </button>
                      <button
                        onClick={() => setPreviewMode('pdf')}
                        disabled={!activeDoc.htmlPath}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          previewMode === 'pdf'
                            ? 'bg-royal-pale text-royal-deep'
                            : activeDoc.htmlPath
                              ? 'text-dim hover:text-ink hover:bg-pearl'
                              : 'text-clay cursor-not-allowed'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        PDF Preview
                      </button>
                    </div>

                    {activeDoc.notebookContent && previewMode === 'notebook' && (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isEditing
                            ? 'bg-honey/15 text-honey border border-honey/30'
                            : 'text-dim hover:text-ink hover:bg-pearl'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {isEditing ? 'Exit Edit' : 'Edit'}
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden bg-pearl">
                    {previewMode === 'notebook' ? (
                      <NotebookPreview key={activeDocId} content={activeDoc.notebookContent} onCellEdit={isEditing ? handleCellEdit : undefined} editable={isEditing} />
                    ) : (
                      <PdfPreview key={activeDocId} pdfPath={activeDoc.pdfPath} htmlPath={activeDoc.htmlPath} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'history' && (
              <div className="h-full overflow-auto p-6 bg-pearl">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-snow rounded-xl border border-sand shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                        <Clock className="w-4 h-4 text-royal" />
                        Conversion History
                      </h2>
                      {history.length > 0 && (
                        <button onClick={() => setHistory([])} className="text-xs text-crimson/70 hover:text-crimson flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" /> Clear All
                        </button>
                      )}
                    </div>
                    {history.length === 0 ? (
                      <div className="text-center py-10">
                        <Clock className="w-10 h-10 mx-auto mb-3 text-clay" />
                        <p className="text-dim text-sm">No conversions yet</p>
                        <p className="text-mute text-xs mt-1">Your converted files will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {history.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-pearl transition-colors group">
                            <div className="flex-1 min-w-0">
                              <p className="text-ink text-sm font-medium truncate">{item.fileName}</p>
                              <p className="text-mute text-xs mt-0.5">{new Date(item.convertedAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={async () => {
                                  try {
                                    const defaultName = item.fileName.replace('.ipynb', '.pdf');
                                    const savePath = await save({ defaultPath: defaultSavePath ? `${defaultSavePath}/${defaultName}` : defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
                                    if (savePath) { await invoke('save_pdf', { sourcePath: item.pdfPath, destPath: savePath }); }
                                  } catch (e) { console.error('Failed to save:', e); }
                                }}
                                className="p-1.5 text-clover hover:bg-clover-soft rounded-md" title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setHistory(prev => prev.filter(h => h.id !== item.id))} className="p-1.5 text-crimson/50 hover:text-crimson hover:bg-crimson-soft rounded-md" title="Remove">
                                <Trash2 className="w-3.5 h-3.5" />
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
              <div className="h-full overflow-auto p-6 bg-pearl">
                <div className="max-w-2xl mx-auto space-y-5">
                  <div className="bg-snow rounded-xl border border-sand shadow-sm p-6">
                    <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-5">General</h2>
                    <div className="flex items-center justify-between py-3.5 border-b border-sand/50">
                      <div><p className="text-ink text-sm font-medium">Output Quality</p><p className="text-mute text-xs mt-0.5">PDF resolution</p></div>
                      <select className="px-3 py-1.5 bg-pearl border border-sand rounded-lg text-xs text-ink"><option>High</option><option>Medium</option><option>Low</option></select>
                    </div>
                    <div className="flex items-center justify-between py-3.5 border-b border-sand/50">
                      <div><p className="text-ink text-sm font-medium">Default Save Location</p><p className="text-mute text-xs mt-0.5 truncate max-w-[200px]">{defaultSavePath || 'Not set'}</p></div>
                      <button onClick={handleBrowseSavePath} className="flex items-center gap-1.5 px-3 py-1.5 bg-pearl border border-sand rounded-lg text-xs text-dim hover:text-ink hover:bg-sand/30">
                        <Folder className="w-3.5 h-3.5" /> Browse
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-3.5">
                      <div><p className="text-ink text-sm font-medium">Auto-open PDF</p><p className="text-mute text-xs mt-0.5">Open after conversion</p></div>
                      <Toggle checked={autoOpenPdf} onChange={setAutoOpenPdf} />
                    </div>
                  </div>

                  <div className="bg-snow rounded-xl border border-sand shadow-sm p-6">
                    <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-5">PDF Layout</h2>
                    <div className="flex items-center justify-between py-3.5">
                      <div><p className="text-ink text-sm font-medium">Page Orientation</p><p className="text-mute text-xs mt-0.5">Portrait or landscape</p></div>
                      <select value={pdfOrientation} onChange={(e) => setPdfOrientation(e.target.value as 'portrait' | 'landscape')} className="px-3 py-1.5 bg-pearl border border-sand rounded-lg text-xs text-ink">
                        <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-snow rounded-xl border border-sand shadow-sm p-6">
                    <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-5">Themes</h2>
                    <div className="flex items-center justify-between py-3.5 border-b border-sand/50">
                      <div><p className="text-ink text-sm font-medium">Document Theme</p><p className="text-mute text-xs mt-0.5">Overall appearance</p></div>
                      <select value={pdfTheme} onChange={(e) => setPdfTheme(e.target.value as 'light' | 'dark' | 'solarized')} className="px-3 py-1.5 bg-pearl border border-sand rounded-lg text-xs text-ink">
                        <option value="light">Light</option><option value="dark">Dark Mode</option><option value="solarized">Solarized</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between py-3.5">
                      <div><p className="text-ink text-sm font-medium">Code Syntax</p><p className="text-mute text-xs mt-0.5">Highlighting style</p></div>
                      <select value={codeTheme} onChange={(e) => setCodeTheme(e.target.value as 'default' | 'monokai' | 'github' | 'vscode-dark')} className="px-3 py-1.5 bg-pearl border border-sand rounded-lg text-xs text-ink">
                        <option value="default">Default</option><option value="monokai">Monokai</option><option value="github">GitHub</option><option value="vscode-dark">VS Code Dark</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-snow rounded-xl border border-sand shadow-sm p-6">
                    <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-5">Branding</h2>
                    <div className="flex items-center justify-between py-3.5 border-b border-sand/50">
                      <div><p className="text-ink text-sm font-medium">Author Name</p><p className="text-mute text-xs mt-0.5">Shown in PDF header</p></div>
                      <input type="text" value={pdfAuthor} onChange={(e) => setPdfAuthor(e.target.value)} placeholder="Your name" className="px-3 py-1.5 bg-pearl border border-sand rounded-lg text-xs text-ink w-44 focus:outline-none focus:border-royal/40 focus:ring-1 focus:ring-royal/20" />
                    </div>
                    <div className="flex items-center justify-between py-3.5">
                      <div><p className="text-ink text-sm font-medium">Show Date Header</p><p className="text-mute text-xs mt-0.5">Add date to PDF</p></div>
                      <Toggle checked={showDateHeader} onChange={setShowDateHeader} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'help' && (
              <div className="h-full overflow-auto p-6 bg-pearl">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-snow rounded-xl border border-sand shadow-sm p-6 space-y-6">
                    <div>
                      <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-4">How to use</h2>
                      <ol className="text-ink/80 space-y-2.5 text-sm">
                        <li className="flex gap-3"><span className="text-royal font-bold">1.</span> Drop a Jupyter notebook (.ipynb) or click to browse</li>
                        <li className="flex gap-3"><span className="text-royal font-bold">2.</span> Preview and optionally edit the notebook</li>
                        <li className="flex gap-3"><span className="text-royal font-bold">3.</span> Click Convert to PDF to generate</li>
                        <li className="flex gap-3"><span className="text-royal font-bold">4.</span> Preview the result and download</li>
                      </ol>
                    </div>
                    <div className="border-t border-sand/50 pt-5">
                      <h2 className="text-[11px] font-semibold text-mute uppercase tracking-widest mb-4">Features</h2>
                      <ul className="text-ink/70 space-y-2 text-sm">
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-royal flex-shrink-0" /> Edit notebook cells before conversion</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-royal flex-shrink-0" /> Preview both notebook and PDF</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-royal flex-shrink-0" /> Multiple documents with tabs</li>
                        <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-royal flex-shrink-0" /> Customizable themes and branding</li>
                      </ul>
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
