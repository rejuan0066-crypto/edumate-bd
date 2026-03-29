import { ReactNode } from 'react';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';

interface ModuleGuardProps {
  menuPath: string;
  children: ReactNode;
}

const ModuleGuard = ({ menuPath, children }: ModuleGuardProps) => {
  const { currentEnabled, getModuleInfo } = useModuleAccess(menuPath);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const bn = language === 'bn';
  const info = getModuleInfo(menuPath);

  if (!currentEnabled) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <ShieldOff className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {bn ? 'মডিউল নিষ্ক্রিয়' : 'Module Disabled'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {bn
                  ? `"${info?.name_bn || menuPath}" মডিউলটি বর্তমানে বন্ধ আছে। সক্রিয় করতে মডিউল ম্যানেজারে যান।`
                  : `The "${info?.name || menuPath}" module is currently disabled. Go to Module Manager to enable it.`}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  {bn ? 'ড্যাশবোর্ড' : 'Dashboard'}
                </Button>
                <Button onClick={() => navigate('/admin/module-manager')}>
                  {bn ? 'মডিউল ম্যানেজার' : 'Module Manager'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return <>{children}</>;
};

export default ModuleGuard;
