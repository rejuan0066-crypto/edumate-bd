import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail } from 'lucide-react';
import { usePrincipalOfficer } from '@/hooks/usePrincipalOfficer';

interface Props {
  settings: any;
  language: string;
  t: (key: string) => string;
}

const HomePrincipalCard = ({ settings: rawSettings, language, t }: Props) => {
  const bn = language === 'bn';
  const { data: principal } = usePrincipalOfficer();
  const settings = principal
    ? {
        ...rawSettings,
        principal_name: bn
          ? (principal.principal_name || rawSettings.principal_name)
          : (principal.principal_name_en || principal.principal_name || rawSettings.principal_name),
        principal_title_bn: principal.principal_title_bn || rawSettings.principal_title_bn,
        principal_title_en: principal.principal_title_en || rawSettings.principal_title_en,
        principal_photo_url: principal.principal_photo_url || rawSettings.principal_photo_url,
        phone: principal.phone || rawSettings.phone,
        email: principal.email || rawSettings.email,
      }
    : rawSettings;

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-primary px-4 py-3 sm:py-3.5">
        <h2 className="text-base sm:text-lg font-bold text-primary-foreground font-display text-center flex items-center justify-center gap-2 tracking-wide">
          <span>✦</span>
          {t('principalMessage')}
        </h2>
      </div>
      <div className="p-5 sm:p-6 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-secondary overflow-hidden mb-4 border-4 border-primary/20 shadow-md">
          {settings.principal_photo_url ? (
            <img src={settings.principal_photo_url} alt="Principal" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/40">👤</div>
          )}
        </div>
        <p className="font-bold text-foreground text-base sm:text-lg">{settings.principal_name}</p>
        <p className="text-sm text-primary font-medium mt-0.5 mb-1.5">
          {bn ? 'পদবী:' : 'Position:'} {bn ? settings.principal_title_bn : settings.principal_title_en}
        </p>
        {settings.email && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
            <Mail className="w-3.5 h-3.5" /> {settings.email}
          </p>
        )}
        {settings.phone && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center mt-0.5">
            <Phone className="w-3.5 h-3.5" /> {settings.phone}
          </p>
        )}
        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed line-clamp-4 mt-3">
          {bn ? settings.principal_message_bn : settings.principal_message_en}
        </p>
        <Link to="/about#principal-message" className="inline-flex items-center gap-1.5 text-sm sm:text-base text-primary hover:underline mt-4 font-semibold">
          {bn ? 'আরও পড়ুন.....' : 'Read more.....'} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default HomePrincipalCard;
