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
    <ScrollArea className="h-full">
    <div className="space-y-5 pr-1">
      {/* Principal Card */}
      <div className="card-elevated overflow-hidden">
        <div className="bg-primary px-4 py-3">
          <h3 className="text-sm font-bold text-primary-foreground font-display text-center">
            {t('principalMessage')}
          </h3>
        </div>
        <div className="p-5 text-center">
          <div className="w-28 h-28 mx-auto rounded-full bg-secondary overflow-hidden mb-4 border-4 border-primary/15 shadow-lg">
            {settings.principal_photo_url ? (
              <img src={settings.principal_photo_url} alt="Principal" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/40">👤</div>
            )}
          </div>
          <p className="font-bold text-foreground text-base">{settings.principal_name}</p>
          <p className="text-xs text-muted-foreground mb-3">
            {bn ? settings.principal_title_bn : settings.principal_title_en}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
            {bn ? settings.principal_message_bn : settings.principal_message_en}
          </p>
          <Link to="/about" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-4 font-medium">
            {bn ? 'বিস্তারিত' : 'Read More'} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card-elevated overflow-hidden">
        <div className="bg-accent px-4 py-2.5">
          <h3 className="text-xs font-bold text-accent-foreground font-display text-center">
            {bn ? 'দ্রুত লিংক' : 'Quick Links'}
          </h3>
        </div>
        <div className="p-2">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-foreground hover:bg-primary/5 transition-colors group"
            >
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <link.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="group-hover:text-primary transition-colors font-medium">
                {bn ? link.labelBn : link.labelEn}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
    </ScrollArea>
  );
};

export default HomePrincipalCard;
