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
    <div className="w-48 bg-linen border-r border-sand flex flex-col py-3 px-3 gap-0.5">
      <div className="px-3 py-2 mb-2">
        <p className="text-[10px] font-semibold text-mute uppercase tracking-widest">Navigation</p>
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all
            ${activeView === item.id
              ? 'bg-royal text-white shadow-md shadow-royal/20'
              : 'text-dim hover:text-ink hover:bg-sand/50'
            }
          `}
        >
          <item.icon className="w-[18px] h-[18px]" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
