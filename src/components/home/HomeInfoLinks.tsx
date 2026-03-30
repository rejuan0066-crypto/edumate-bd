import { Link } from 'react-router-dom';
import { Users, UserCheck, BookOpen, GraduationCap, FileText, List, Award, Globe, Heart, Star, Shield, Clock, MapPin, Phone, Mail, Settings, Bookmark, Layers, Tag } from 'lucide-react';
import { InfoLink } from '@/hooks/useWebsiteSettings';

interface Props {
  language: string;
  infoLinks?: InfoLink[];
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Users, UserCheck, BookOpen, GraduationCap, FileText, List, Award, Globe, Heart, Star, Shield, Clock, MapPin, Phone, Mail, Settings, Bookmark, Layers, Tag,
};

const defaultLinks: InfoLink[] = [
  { id: 'officials', label_bn: 'কর্মকর্তাবৃন্দ', label_en: 'Officials', path: '/about', icon: 'Users', visible: true, sort_order: 0 },
  { id: 'staff3', label_bn: '৩য় শ্রেণির কর্মচারীবৃন্দ', label_en: 'Class 3 Staff', path: '/about', icon: 'UserCheck', visible: true, sort_order: 1 },
  { id: 'classes', label_bn: 'শ্রেণী', label_en: 'Classes', path: '/about', icon: 'BookOpen', visible: true, sort_order: 2 },
  { id: 'student-info', label_bn: 'শিক্ষার্থীদের তথ্য', label_en: 'Student Info', path: '/student-info', icon: 'GraduationCap', visible: true, sort_order: 3 },
  { id: 'syllabus', label_bn: 'সিলেবাস', label_en: 'Syllabus', path: '/about', icon: 'FileText', visible: true, sort_order: 4 },
  { id: 'routines', label_bn: 'রুটিনসমূহ', label_en: 'Routines', path: '/about', icon: 'List', visible: true, sort_order: 5 },
  { id: 'results', label_bn: 'পরীক্ষাসমূহের ফলাফল', label_en: 'Exam Results', path: '/result', icon: 'Award', visible: true, sort_order: 6 },
];

const HomeInfoLinks = ({ language, infoLinks }: Props) => {
  const bn = language === 'bn';
  const links = (infoLinks && infoLinks.length > 0 ? infoLinks : defaultLinks)
    .filter(l => l.visible)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-primary px-4 py-3">
        <h3 className="text-sm font-bold text-primary-foreground font-display text-center flex items-center justify-center gap-2">
          <span>✦</span>
          {bn ? 'মাদ্রাসা সম্পর্কিত তথ্য' : 'Institution Info'}
        </h3>
      </div>
      <div className="flex-1 p-2">
        {links.map((link) => {
          const IconComp = ICON_MAP[link.icon] || Globe;
          return (
            <Link
              key={link.id}
              to={link.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-primary/5 transition-colors group"
            >
              <IconComp className="w-4 h-4 text-primary shrink-0" />
              <span className="group-hover:text-primary transition-colors font-medium">
                {bn ? link.label_bn : link.label_en}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomeInfoLinks;
