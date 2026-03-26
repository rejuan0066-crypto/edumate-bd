import { forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const LanguageToggle = forwardRef<HTMLButtonElement>((_, ref) => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      ref={ref}
      onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
    >
      {language === 'bn' ? 'EN' : 'বাং'}
    </button>
  );
});

LanguageToggle.displayName = 'LanguageToggle';

export default LanguageToggle;
