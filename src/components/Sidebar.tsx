import { FileText, History, Settings, HelpCircle } from 'lucide-react';

interface SidebarProps {
  activeView: 'convert' | 'history' | 'settings' | 'help';
  onViewChange: (view: 'convert' | 'history' | 'settings' | 'help') => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const items = [
    { id: 'convert' as const, icon: FileText, label: 'Convert' },
    { id: 'history' as const, icon: History, label: 'History' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
    { id: 'help' as const, icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div className="w-16 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`
            w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all
            ${activeView === item.id 
              ? 'bg-blue-100 text-blue-600' 
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }
          `}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
