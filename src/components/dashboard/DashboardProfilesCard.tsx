import { useLanguage } from '@/contexts/LanguageContext';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useCurrentStaff } from '@/hooks/useCurrentStaff';
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
  const { settings } = useWebsiteSettings();
  const { data: myStaff } = useCurrentStaff();

  // Prefer the logged-in user's own staff record everywhere; fall back to
  // institution-level admin info from website settings only if no staff record exists.
  const staffName = myStaff ? (bn ? myStaff.name_bn : (myStaff.name_en || myStaff.name_bn)) : null;

  const adminName = staffName || (bn ? settings.admin_name : (settings.admin_name || ''));
  const adminTitle = myStaff?.designation || (bn ? settings.admin_title_bn : settings.admin_title_en);
  const adminEmail = myStaff?.email || settings.admin_email;
  const adminPhone = myStaff?.phone || settings.admin_phone;
  const adminPhoto = myStaff?.photo_url || settings.admin_photo_url;
  const adminMessage = bn ? settings.admin_message_bn : settings.admin_message_en;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ProfileCard
        title={bn ? 'এডমিন প্রোফাইল' : 'Admin Profile'}
        name={adminName}
        designation={adminTitle}
        email={adminEmail}
        phone={adminPhone}
        message={adminMessage}
        photo={adminPhoto}
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
