import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail } from 'lucide-react';

interface Props {
  settings: any;
  language: string;
  t: (key: string) => string;
}

const HomeAdminCard = ({ settings, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-accent px-4 py-3 sm:py-3.5">
        <h2 className="text-base sm:text-lg font-bold text-accent-foreground font-display text-center flex items-center justify-center gap-2 tracking-wide">
          <span>✦</span>
          {bn ? 'এডমিনের বাণী' : "Admin's Message"}
        </h2>
      </div>
      <div className="p-5 sm:p-6 text-center flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-secondary overflow-hidden mb-4 border-4 border-accent/25 shadow-md">
          {settings.admin_photo_url ? (
            <img src={settings.admin_photo_url} alt="Admin" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/40">👤</div>
          )}
        </div>
        <p className="font-bold text-foreground text-base sm:text-lg">{settings.admin_name || (bn ? 'প্রশাসক' : 'Admin')}</p>
        <p className="text-sm text-accent font-medium mt-0.5 mb-1.5">
          {bn ? settings.admin_title_bn || 'এডমিন' : settings.admin_title_en || 'Admin'}
        </p>
        {settings.admin_email && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
            <Mail className="w-3.5 h-3.5" /> {settings.admin_email}
          </p>
        )}
        {settings.admin_phone && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center mt-0.5">
            <Phone className="w-3.5 h-3.5" /> {settings.admin_phone}
          </p>
        )}
        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed line-clamp-4 mt-3">
          {bn ? settings.admin_message_bn || '' : settings.admin_message_en || ''}
        </p>
        <Link to="/about#admin-message" className="inline-flex items-center gap-1.5 text-sm sm:text-base text-accent hover:underline mt-4 font-semibold">
          {bn ? 'আরও পড়ুন.....' : 'Read more.....'} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default HomeAdminCard;
