import { forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft } from 'lucide-react';

const BackButton = forwardRef<HTMLButtonElement>((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  if (location.pathname === '/' || location.pathname === '/admin') return null;

  return (
    <div className="mt-8 pb-4">
      <button
        ref={ref}
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'bn' ? 'পেছনে যান' : 'Go Back'}
      </button>
    </div>
  );
});

BackButton.displayName = 'BackButton';

export default BackButton;
