import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Lock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import LanguageToggle from '@/components/LanguageToggle';

const Login = () => {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--gradient-hero)' }}>
      <div className="islamic-pattern absolute inset-0" />
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle />
      </div>
      <div className="card-elevated w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
            <GraduationCap className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {language === 'bn' ? 'মাদরাসা ম্যানেজমেন্ট' : 'Madrasa Management'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('signIn')}</p>
        </div>

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); window.location.href = '/admin'; }}>
          <div>
            <Label className="flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4" /> {t('username')}
            </Label>
            <Input placeholder={language === 'bn' ? 'ইউজারনেম বা ইমেইল' : 'Username or Email'} className="bg-background" />
          </div>
          <div>
            <Label className="flex items-center gap-2 mb-1.5">
              <Lock className="w-4 h-4" /> {t('password')}
            </Label>
            <Input type="password" placeholder="••••••••" className="bg-background" />
          </div>
          <div className="text-right">
            <a href="#" className="text-sm text-primary hover:underline">{t('forgotPassword')}</a>
          </div>
          <Button type="submit" className="btn-primary-gradient w-full py-5 text-base">
            {t('signIn')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← {language === 'bn' ? 'হোমে ফিরুন' : 'Back to Home'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
