import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export type ConversionStatus = 'idle' | 'converting' | 'success' | 'error';

interface ConversionProgressProps {
  status: ConversionStatus;
  errorMessage?: string;
}

export function ConversionProgress({ status, errorMessage }: ConversionProgressProps) {
  if (status === 'idle') return null;

  const config = {
    converting: { border: 'border-l-royal', bg: 'bg-royal-soft/50', icon: <Loader2 className="w-5 h-5 text-royal animate-spin" />, title: 'Converting...', desc: 'This may take a moment' },
    success: { border: 'border-l-clover', bg: 'bg-clover-soft', icon: <CheckCircle className="w-5 h-5 text-clover" />, title: 'Ready', desc: 'PDF generated successfully' },
    error: { border: 'border-l-crimson', bg: 'bg-crimson-soft', icon: <XCircle className="w-5 h-5 text-crimson" />, title: 'Failed', desc: errorMessage || 'An error occurred' },
  };

  const c = config[status];

  return (
    <div className={`border-l-4 ${c.border} ${c.bg} rounded-r-lg p-3.5`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">{c.icon}</div>
        <div>
          <p className="text-ink text-sm font-medium">{c.title}</p>
          <p className={`text-xs mt-0.5 ${status === 'error' ? 'text-crimson/80' : 'text-dim'}`}>{c.desc}</p>
        </div>
      </div>
    </div>
  );
}
