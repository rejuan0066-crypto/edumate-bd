import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, UserCog, BookOpen, CreditCard, Bell, GraduationCap, UserCheck, UserX } from 'lucide-react';

const statCards = [
  { key: 'totalStudents', value: '523', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'totalTeachers', value: '32', icon: BookOpen, color: 'text-info', bg: 'bg-info/10' },
  { key: 'totalStaff', value: '18', icon: UserCog, color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'activeStudents', value: '498', icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
];

const quickStats = [
  { labelBn: 'এতিম ছাত্র', labelEn: 'Orphan Students', value: '45' },
  { labelBn: 'গরীব ছাত্র', labelEn: 'Poor Students', value: '78' },
  { labelBn: 'আবাসিক ছাত্র', labelEn: 'Resident Students', value: '210' },
  { labelBn: 'অনাবাসিক ছাত্র', labelEn: 'Non-Resident', value: '313' },
  { labelBn: 'নতুন ছাত্র', labelEn: 'New Students', value: '85' },
  { labelBn: 'পুরাতন ছাত্র', labelEn: 'Old Students', value: '438' },
  { labelBn: 'নিষ্ক্রিয় ছাত্র', labelEn: 'Inactive Students', value: '25' },
];

const Dashboard = () => {
  const { t, language } = useLanguage();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Madrasa Info */}
        <div className="card-elevated p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-9 h-9 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">নূরুল ইসলাম মাদরাসা</h2>
            <p className="text-sm text-muted-foreground">ঢাকা, বাংলাদেশ | +880 1XXX-XXXXXX | info@madrasa.edu.bd</p>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{t(s.key)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">
            {language === 'bn' ? 'পরিসংখ্যান' : 'Statistics'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickStats.map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/50 text-center hover:bg-secondary transition-colors cursor-pointer">
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{language === 'bn' ? s.labelBn : s.labelEn}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Summary + Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {language === 'bn' ? 'ফি সারাংশ' : 'Fee Summary'}
            </h3>
            <div className="space-y-3">
              {[
                { label: language === 'bn' ? 'মাসিক ফি (মার্চ ২০২৬)' : 'Monthly Fee (Mar 2026)', amount: '৳ 1,25,000' },
                { label: language === 'bn' ? 'পরীক্ষা ফি' : 'Exam Fee', amount: '৳ 45,000' },
                { label: language === 'bn' ? 'ভর্তি ফি' : 'Admission Fee', amount: '৳ 85,000' },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                  <span className="text-sm text-foreground">{f.label}</span>
                  <span className="font-bold text-primary">{f.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5">
            <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              {language === 'bn' ? 'সাম্প্রতিক নোটিশ' : 'Recent Notices'}
            </h3>
            <div className="space-y-3">
              {[
                { title: 'বার্ষিক পরীক্ষার সময়সূচী', status: 'approved', statusBn: 'অনুমোদিত' },
                { title: 'রমজান ক্লাস সময়সূচী', status: 'pending', statusBn: 'অপেক্ষমান' },
                { title: 'নতুন ভর্তি বিজ্ঞপ্তি', status: 'approved', statusBn: 'অনুমোদিত' },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-sm text-foreground">{n.title}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${n.status === 'approved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {language === 'bn' ? n.statusBn : n.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
