import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export type ConversionStatus = 'idle' | 'converting' | 'success' | 'error';

interface ConversionProgressProps {
  status: ConversionStatus;
  errorMessage?: string;
}

export function ConversionProgress({ status, errorMessage }: ConversionProgressProps) {
  if (status === 'idle') return null;

  const styles = {
    converting: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`border rounded-xl p-4 ${styles[status]}`}>
      <div className="flex items-center gap-4">
        {status === 'converting' && (
          <>
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div>
              <p className="text-gray-800 font-medium">Converting...</p>
              <p className="text-gray-500 text-sm">This may take a few seconds</p>
            </div>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-gray-800 font-medium">Conversion Complete!</p>
              <p className="text-gray-500 text-sm">Your PDF is ready to download</p>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-gray-800 font-medium">Conversion Failed</p>
              <p className="text-red-600 text-sm">{errorMessage || 'An error occurred'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
