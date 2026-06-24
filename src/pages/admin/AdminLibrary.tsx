import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BookOpen, Package, BarChart3, Users } from 'lucide-react';
import LibraryDashboard from '@/components/library/LibraryDashboard';
import LibraryInventory from '@/components/library/LibraryInventory';
import LibraryProfiles from '@/components/library/LibraryProfiles';
import LibraryReports from '@/components/library/LibraryReports';

const AdminLibrary = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [tab, setTab] = useState('profiles');

  const tabs = [
    { key: 'profiles', label: bn ? 'প্রোফাইল' : 'Profiles', icon: Users },
    { key: 'dashboard', label: bn ? 'ড্যাশবোর্ড' : 'Dashboard', icon: BarChart3 },
    { key: 'inventory', label: bn ? 'ইনভেন্টরি' : 'Inventory', icon: Package },
    { key: 'reports', label: bn ? 'রিপোর্ট' : 'Reports', icon: BookOpen },
  ];


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{bn ? 'লাইব্রেরি ম্যানেজমেন্ট' : 'Library Management'}</h1>
          <p className="text-sm text-muted-foreground">{bn ? 'বই, ইস্যু ও বিলিং সিস্টেম' : 'Books, Issue & Billing System'}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="flex items-center gap-1.5 text-xs sm:text-sm">
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profiles"><LibraryProfiles /></TabsContent>
        <TabsContent value="dashboard"><LibraryDashboard /></TabsContent>
        <TabsContent value="inventory"><LibraryInventory /></TabsContent>
        <TabsContent value="reports"><LibraryReports /></TabsContent>
      </Tabs>

    </div>
  );
};

export default AdminLibrary;
