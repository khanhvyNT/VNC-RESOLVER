import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useI18n } from '../services/i18n';

interface VncScreenshotProps {
  id: number;
  className?: string;
}

export const VncScreenshot: React.FC<VncScreenshotProps> = ({ id, className = '' }) => {
  const { t } = useI18n();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <div className={`w-full flex flex-col items-center justify-center bg-zinc-950 rounded border border-zinc-800/80 relative overflow-hidden ${className}`}>
      {!error && (
        <img
          src={`https://computernewb.com/vncresolver/api/v1/screenshot/${id}`}
          alt={`VNC Screenshot ${id}`}
          className={`w-full h-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      )}
      
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center gap-2 text-zinc-600 py-6">
          <ImageOff className="w-6 h-6 opacity-50" />
          <span className="text-[10px] font-mono">{t('details.noScreenshot')}</span>
        </div>
      )}
    </div>
  );
};
