import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { UserCog, User, Mail, Phone, Briefcase } from 'lucide-react';

const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
        <p className="text-foreground font-medium truncate">{value}</p>
      </div>
    </div>
  );
};

const ProfileCard = ({
  title,
  name,
  designation,
  email,
  phone,
  message,
  photo,
  accentClass,
}: {
  title: string;
  name?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  photo?: string | null;
  accentClass: string;
}) => (
  <div className="card-elevated overflow-hidden flex flex-col">
    <div className={`${accentClass} px-4 py-2.5`}>
      <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
        <span>✦</span>
        {title}
      </h3>
    </div>
    <div className="p-4 flex gap-4">
      <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden border-4 border-primary/15 shadow-md shrink-0">
        {photo ? (
          <img src={photo} alt={name || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground/40">👤</div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-bold text-foreground text-sm truncate">{name || '-'}</p>
        {designation && <p className="text-xs text-muted-foreground truncate">{designation}</p>}
        <div className="grid grid-cols-1 gap-1 pt-1">
          <Field icon={Mail} label="Email" value={email} />
          <Field icon={Phone} label="Phone" value={phone} />
        </div>
        {message && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 pt-1 italic">"{message}"</p>
        )}
      </div>
    </div>
  </div>
);

const DashboardProfilesCard = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const { settings } = useWebsiteSettings();

  // Logged-in staff record from DB (matched by user_id or email)
  const { data: myStaff } = useQuery({
    queryKey: ['dashboard-my-staff', user?.id, user?.email],
    queryFn: async () => {
      if (!user) return null;
      // Try by user_id first
      let { data } = await supabase
        .from('staff')
        .select('name_bn, name_en, designation, department, email, phone, photo_url, staff_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (!data && user.email) {
        const res = await supabase
          .from('staff')
          .select('name_bn, name_en, designation, department, email, phone, photo_url, staff_id')
          .eq('email', user.email)
          .is('deleted_at', null)
          .maybeSingle();
        data = res.data;
      }
      return data;
    },
    enabled: !!user,
  });

  const adminName = bn ? settings.admin_name : (settings.admin_name || '');
  const adminTitle = bn ? settings.admin_title_bn : settings.admin_title_en;
  const adminMessage = bn ? settings.admin_message_bn : settings.admin_message_en;

  const staffName = myStaff ? (bn ? myStaff.name_bn : (myStaff.name_en || myStaff.name_bn)) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ProfileCard
        title={bn ? 'এডমিন প্রোফাইল' : 'Admin Profile'}
        name={adminName}
        designation={adminTitle}
        email={settings.admin_email}
        phone={settings.admin_phone}
        message={adminMessage}
        photo={settings.admin_photo_url}
        accentClass="bg-accent"
      />
      <ProfileCard
        title={bn ? 'স্টাফ প্রোফাইল' : 'Staff Profile'}
        name={staffName}
        designation={myStaff?.designation}
        email={myStaff?.email}
        phone={myStaff?.phone}
        photo={myStaff?.photo_url}
        accentClass="bg-primary"
      />
    </div>
  );
};

export default DashboardProfilesCard;
