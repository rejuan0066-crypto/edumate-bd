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
    <div className={position === 'top' ? 'hidden sm:block mb-3' : 'mt-6 pb-4'}>
      <button
        ref={ref}
        onClick={() => navigate(-1)}
        className="group inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium
          bg-card/80 backdrop-blur-md
          border border-border/40
          rounded-full shadow-xs
          text-muted-foreground
          hover:bg-background/90 hover:text-emerald-600 hover:border-emerald-200/50
          active:scale-[0.97]
          transition-all duration-200 ease-out"
      >
        <ArrowLeft
          className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          strokeWidth={2}
        />
        {language === 'bn' ? 'পেছনে যান' : 'Go Back'}
      </button>
    </div>
  );
});

BackButton.displayName = 'BackButton';

export default BackButton;
