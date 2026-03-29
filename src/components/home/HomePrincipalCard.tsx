import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, BookOpen, FileText, GraduationCap, Users } from 'lucide-react';

interface Props {
  settings: any;
  language: string;
  t: (key: string) => string;
}

const quickLinks = [
  { path: '/about', icon: BookOpen, labelBn: 'আমাদের সম্পর্কে', labelEn: 'About Us' },
  { path: '/notices', icon: FileText, labelBn: 'নোটিশ বোর্ড', labelEn: 'Notices' },
  { path: '/admission', icon: GraduationCap, labelBn: 'ভর্তি তথ্য', labelEn: 'Admission' },
  { path: '/posts', icon: Users, labelBn: 'সংবাদ ও পোস্ট', labelEn: 'News & Posts' },
];

const HomePrincipalCard = ({ settings, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="space-y-4">
      {/* Principal Card */}
      <div className="card-elevated overflow-hidden">
        <div className="bg-primary p-3">
          <h3 className="text-sm font-bold text-primary-foreground font-display text-center">
            {t('principalMessage')}
          </h3>
        </div>
        <div className="p-4 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-secondary overflow-hidden mb-3 border-2 border-primary/20">
            {settings.principal_photo_url ? (
              <img src={settings.principal_photo_url} alt="Principal" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
            )}
          </div>
          <p className="font-semibold text-foreground text-sm">{settings.principal_name}</p>
          <p className="text-[11px] text-muted-foreground mb-3">
            {bn ? settings.principal_title_bn : settings.principal_title_en}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
            {bn ? settings.principal_message_bn : settings.principal_message_en}
          </p>
          <Link to="/about" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-3">
            {bn ? 'বিস্তারিত' : 'Read More'} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card-elevated overflow-hidden">
        <div className="bg-accent p-2.5">
          <h3 className="text-xs font-bold text-accent-foreground font-display text-center">
            {bn ? 'দ্রুত লিংক' : 'Quick Links'}
          </h3>
        </div>
        <div className="p-2">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-foreground hover:bg-secondary/80 transition-colors group"
            >
              <link.icon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="group-hover:text-primary transition-colors">
                {bn ? link.labelBn : link.labelEn}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePrincipalCard;
