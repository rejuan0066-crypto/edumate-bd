import { forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  position?: 'top' | 'bottom';
}

const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(({ position = 'bottom' }, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  if (location.pathname === '/' || location.pathname === '/admin') return null;

  return (
    <div className={position === 'top' ? 'block mb-3.5' : 'mt-6 pb-4'}>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }}
        className="group inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold
          bg-white/95 dark:bg-card/90 backdrop-blur-md
          border border-slate-200/90 dark:border-border/80
          rounded-full shadow-2xs hover:shadow-xs
          text-slate-700 dark:text-foreground
          hover:bg-emerald-50/70 hover:border-emerald-300/80 hover:text-emerald-900 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-700 dark:hover:text-emerald-300
          active:scale-[0.98]
          transition-all duration-200 ease-out cursor-pointer select-none"
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 group-hover:bg-emerald-800 group-hover:text-white transition-all duration-200 shrink-0 shadow-2xs">
          <ArrowLeft
            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
            strokeWidth={2.2}
          />
        </span>
        <span className="tracking-wide">
          {language === 'bn' ? 'পেছনে ফিরে যান' : 'Go Back'}
        </span>
      </button>
    </div>
  );
});

BackButton.displayName = 'BackButton';

export default BackButton;
