import { Link } from 'react-router-dom';
import { Users, UserCheck, BookOpen, GraduationCap, FileText, List, ClipboardList, Award } from 'lucide-react';

interface Props {
  language: string;
}

const links = [
  { path: '/about', icon: Users, labelBn: 'কর্মকর্তাবৃন্দ', labelEn: 'Officials' },
  { path: '/about', icon: UserCheck, labelBn: '৩য় শ্রেণির কর্মচারীবৃন্দ', labelEn: 'Class 3 Staff' },
  { path: '/about', icon: BookOpen, labelBn: 'শ্রেণী', labelEn: 'Classes' },
  { path: '/student-info', icon: GraduationCap, labelBn: 'শিক্ষার্থীদের তথ্য', labelEn: 'Student Info' },
  { path: '/about', icon: FileText, labelBn: 'সিলেবাস', labelEn: 'Syllabus' },
  { path: '/about', icon: List, labelBn: 'রুটিনসমূহ', labelEn: 'Routines' },
  { path: '/result', icon: Award, labelBn: 'পরীক্ষাসমূহের ফলাফল', labelEn: 'Exam Results' },
];

const HomeInfoLinks = ({ language }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-primary px-4 py-3">
        <h3 className="text-sm font-bold text-primary-foreground font-display text-center flex items-center justify-center gap-2">
          <span>✦</span>
          {bn ? 'মাদ্রাসা সম্পর্কিত তথ্য' : 'Institution Info'}
        </h3>
      </div>
      <div className="flex-1 p-2">
        {links.map((link) => (
          <Link
            key={link.labelEn}
            to={link.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-primary/5 transition-colors group"
          >
            <link.icon className="w-4 h-4 text-primary shrink-0" />
            <span className="group-hover:text-primary transition-colors font-medium">
              {bn ? link.labelBn : link.labelEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomeInfoLinks;
