import { FileText } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-center gap-3 py-6">
      <FileText className="w-10 h-10 text-indigo-500" />
      <div>
        <h1 className="text-3xl font-bold text-white">Jupytify</h1>
        <p className="text-slate-400 text-sm">Convert Jupyter Notebooks to PDF</p>
      </div>
    </header>
  );
}
