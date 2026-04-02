import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import {
  LayoutDashboard, Users, UserCog, Layers, CreditCard, Receipt,
  FileText, Bell, Heart, BookOpen, ClipboardCheck, Wallet,
  BarChart3, Globe, Settings, Box, Plus, Edit2, Trash2,
  Power, PowerOff, Shield, GripVertical, Search
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard, Users, UserCog, Layers, CreditCard, Receipt,
  FileText, Bell, Heart, BookOpen, ClipboardCheck, Wallet,
  BarChart3, Globe, Settings, Box,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', label_bn: 'অ্যাডমিন' },
  { value: 'teacher', label: 'Teacher', label_bn: 'শিক্ষক' },
  { value: 'staff', label: 'Staff', label_bn: 'স্টাফ' },
];

type ModuleData = {
  id?: string;
  name: string;
  name_bn: string;
  description: string;
  description_bn: string;
  icon: string;
  menu_path: string;
  is_enabled: boolean;
  is_system: boolean;
  sort_order: number;
  visible_to_roles: string[];
};

const emptyModule: ModuleData = {
  name: '', name_bn: '', description: '', description_bn: '',
  icon: 'Box', menu_path: '', is_enabled: true, is_system: false,
  sort_order: 0, visible_to_roles: ['admin'],
};

const AdminModuleManager = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canEditItem, canDeleteItem } = usePagePermissions('/admin/module-manager');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moduleData, setModuleData] = useState<ModuleData>(emptyModule);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_modules').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ModuleData) => {
      const payload = {
        name: data.name,
        name_bn: data.name_bn,
        description: data.description,
        description_bn: data.description_bn,
        icon: data.icon,
        menu_path: data.menu_path,
        is_enabled: data.is_enabled,
        is_system: data.is_system,
        sort_order: data.sort_order,
        visible_to_roles: data.visible_to_roles,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from('system_modules').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('system_modules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      setDialogOpen(false);
      setModuleData(emptyModule);
      setEditingId(null);
      toast.success(bn ? 'মডিউল সেভ হয়েছে' : 'Module saved');
    },
    onError: () => toast.error(bn ? 'সেভ করতে সমস্যা' : 'Failed to save'),
  });

  const toggleModule = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('system_modules').update({ is_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      toast.success(bn ? 'মডিউল আপডেট হয়েছে' : 'Module updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_modules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-modules'] });
      toast.success(bn ? 'মডিউল মুছে ফেলা হয়েছে' : 'Module deleted');
    },
  });

  const openEdit = (mod: any) => {
    setModuleData({
      name: mod.name, name_bn: mod.name_bn,
      description: mod.description || '', description_bn: mod.description_bn || '',
      icon: mod.icon || 'Box', menu_path: mod.menu_path || '',
      is_enabled: mod.is_enabled, is_system: mod.is_system,
      sort_order: mod.sort_order, visible_to_roles: mod.visible_to_roles || ['admin'],
    });
    setEditingId(mod.id);
    setDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setModuleData(p => ({
      ...p,
      visible_to_roles: p.visible_to_roles.includes(role)
        ? p.visible_to_roles.filter(r => r !== role)
        : [...p.visible_to_roles, role],
    }));
  };

  const filteredModules = modules.filter((m: any) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.name_bn.includes(searchQuery)
  );

  const enabledCount = modules.filter((m: any) => m.is_enabled).length;
  const disabledCount = modules.filter((m: any) => !m.is_enabled).length;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {bn ? 'মডিউল ম্যানেজার' : 'Module Manager'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'সিস্টেমের সকল মডিউল কানেক্ট/ডিসকানেক্ট ও কনফিগার করুন' : 'Connect/disconnect and configure all system modules'}
            </p>
          </div>
          {canAddItem && <Button onClick={() => { setModuleData({ ...emptyModule, sort_order: modules.length }); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন মডিউল' : 'New Module'}
          </Button>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Box className="h-5 w-5 text-primary" />
            </div>
            <div><p className="text-2xl font-bold">{modules.length}</p><p className="text-xs text-muted-foreground">{bn ? 'মোট মডিউল' : 'Total Modules'}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Power className="h-5 w-5 text-green-600" />
            </div>
            <div><p className="text-2xl font-bold text-green-600">{enabledCount}</p><p className="text-xs text-muted-foreground">{bn ? 'সক্রিয়' : 'Active'}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <PowerOff className="h-5 w-5 text-red-500" />
            </div>
            <div><p className="text-2xl font-bold text-red-500">{disabledCount}</p><p className="text-xs text-muted-foreground">{bn ? 'নিষ্ক্রিয়' : 'Disabled'}</p></div>
          </CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={bn ? 'মডিউল খুঁজুন...' : 'Search modules...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredModules.map((mod: any) => {
            const IconComp = ICON_MAP[mod.icon] || Box;
            return (
              <Card key={mod.id} className={`transition-all ${!mod.is_enabled ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${mod.is_enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <IconComp className={`h-5 w-5 ${mod.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{bn ? mod.name_bn : mod.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{bn ? mod.description_bn : mod.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={mod.is_enabled}
                      onCheckedChange={(c) => toggleModule.mutate({ id: mod.id, enabled: c })}
                    />
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(mod.visible_to_roles || []).map((r: string) => (
                      <Badge key={r} variant="outline" className="text-[10px]">
                        <Shield className="h-2.5 w-2.5 mr-0.5" /> {r}
                      </Badge>
                    ))}
                  </div>

                  {/* Path & Actions */}
                  <div className="flex items-center justify-between">
                    <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{mod.menu_path}</code>
                    <div className="flex gap-1">
                      {mod.is_system && <Badge variant="secondary" className="text-[10px]">{bn ? 'সিস্টেম' : 'System'}</Badge>}
                      {canEditItem && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(mod)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>}
                      {canDeleteItem && !mod.is_system && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => { if (confirm(bn ? 'মডিউলটি মুছে ফেলতে চান?' : 'Delete this module?')) deleteMutation.mutate(mod.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setModuleData(emptyModule); setEditingId(null); } }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? (bn ? 'মডিউল সম্পাদনা' : 'Edit Module') : (bn ? 'নতুন মডিউল তৈরি' : 'Create Module')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'নাম (ইংরেজি)' : 'Name (EN)'}</Label>
                  <Input value={moduleData.name} onChange={e => setModuleData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>{bn ? 'নাম (বাংলা)' : 'Name (BN)'}</Label>
                  <Input value={moduleData.name_bn} onChange={e => setModuleData(p => ({ ...p, name_bn: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'বিবরণ (ইংরেজি)' : 'Description (EN)'}</Label>
                  <Textarea value={moduleData.description} onChange={e => setModuleData(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <div>
                  <Label>{bn ? 'বিবরণ (বাংলা)' : 'Description (BN)'}</Label>
                  <Textarea value={moduleData.description_bn} onChange={e => setModuleData(p => ({ ...p, description_bn: e.target.value }))} rows={2} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'আইকন' : 'Icon'}</Label>
                  <Select value={moduleData.icon} onValueChange={v => setModuleData(p => ({ ...p, icon: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(icon => {
                        const IC = ICON_MAP[icon];
                        return (
                          <SelectItem key={icon} value={icon}>
                            <span className="flex items-center gap-2"><IC className="h-4 w-4" /> {icon}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{bn ? 'মেনু পাথ' : 'Menu Path'}</Label>
                  <Input value={moduleData.menu_path} onChange={e => setModuleData(p => ({ ...p, menu_path: e.target.value }))} placeholder="/admin/..." />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{bn ? 'কারা দেখতে পারবে' : 'Visible to Roles'}</Label>
                <div className="flex gap-2">
                  {ROLE_OPTIONS.map(role => (
                    <Button
                      key={role.value}
                      type="button"
                      size="sm"
                      variant={moduleData.visible_to_roles.includes(role.value) ? 'default' : 'outline'}
                      onClick={() => toggleRole(role.value)}
                    >
                      <Shield className="h-3.5 w-3.5 mr-1" />
                      {bn ? role.label_bn : role.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{bn ? 'ক্রম' : 'Sort Order'}</Label>
                  <Input type="number" value={moduleData.sort_order} onChange={e => setModuleData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={moduleData.is_enabled} onCheckedChange={c => setModuleData(p => ({ ...p, is_enabled: c }))} />
                    <Label>{bn ? 'সক্রিয়' : 'Enabled'}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={moduleData.is_system} onCheckedChange={c => setModuleData(p => ({ ...p, is_system: c }))} />
                    <Label>{bn ? 'সিস্টেম' : 'System'}</Label>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={() => saveMutation.mutate(moduleData)} disabled={!moduleData.name || !moduleData.name_bn}>
                {editingId ? (bn ? 'আপডেট করুন' : 'Update') : (bn ? 'তৈরি করুন' : 'Create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminModuleManager;
