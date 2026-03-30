import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface Props {
  settings: any;
  language: string;
  t: (key: string) => string;
}

const HomePrincipalCard = ({ settings, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-primary px-4 py-3">
        <h3 className="text-sm font-bold text-primary-foreground font-display text-center flex items-center justify-center gap-2">
          <span>✦</span>
          {t('principalMessage')}
        </h3>
      </div>
      <div className="p-5 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-secondary overflow-hidden mb-4 border-4 border-primary/15 shadow-lg">
          {settings.principal_photo_url ? (
            <img src={settings.principal_photo_url} alt="Principal" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground/40">👤</div>
          )}
        </div>
        <p className="font-bold text-foreground text-sm">{settings.principal_name}</p>
        <p className="text-xs text-muted-foreground mb-1">
          {bn ? 'পদবী:' : 'Position:'} {bn ? settings.principal_title_bn : settings.principal_title_en}
        </p>
        {settings.email && (
          <p className="text-xs text-muted-foreground">
            {bn ? 'ইমেইল:' : 'Email:'} {settings.email}
          </p>
        )}
        {settings.phone && (
          <p className="text-xs text-muted-foreground">
            {bn ? 'মোবাইল:' : 'Mobile:'} {settings.phone}
          </p>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 mt-3">
          {bn ? settings.principal_message_bn : settings.principal_message_en}
        </p>
        <Link to="/about" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-4 font-medium">
          {bn ? 'আরও পড়ুন.....' : 'Read more.....'} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

export default HomePrincipalCard;
