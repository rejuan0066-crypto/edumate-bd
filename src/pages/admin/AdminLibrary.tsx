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
      {/* ── Standard Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            {bn ? 'লাইব্রেরি ম্যানেজমেন্ট' : 'Library Management'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {bn ? 'বই ক্যাটালগ, শিক্ষার্থী/স্টাফ ইস্যু ও রিটার্ন ট্র্যাকিং সিস্টেম' : 'Catalog management, book issue & return tracking system'}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 p-1 bg-muted/60 border border-border/70 rounded-xl h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.key} value={t.key} className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
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
