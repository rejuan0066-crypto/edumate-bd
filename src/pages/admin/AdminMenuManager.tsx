import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMenuSettings, MenuItemConfig, DEFAULT_MENU_CONFIG } from '@/hooks/useMenuSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, RotateCcw, GripVertical, ChevronDown, ChevronUp, Eye, EyeOff, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const ICON_OPTIONS = [
  'LayoutDashboard', 'Users', 'UserCog', 'BookOpen', 'FileText', 'Bell',
  'CreditCard', 'Settings', 'Globe', 'GraduationCap', 'Heart', 'Layers',
  'Receipt', 'ReceiptText', 'FileSignature', 'FilePlus', 'FileCheck', 'Tag',
  'Wrench', 'Blocks', 'FlaskConical', 'CalendarDays', 'ShieldCheck', 'BarChart3',
  'KeyRound', 'Palette', 'ListOrdered', 'UserCircle', 'FileBox', 'Home',
  'Image', 'Mail', 'Phone', 'MapPin', 'Star', 'Award', 'Clock', 'Folder',
];

interface EditDialogState {
  open: boolean;
  item: MenuItemConfig | null;
  parentIdx: number | null;
  childIdx: number | null;
  type: 'sidebar' | 'public';
}

const AdminMenuManager = () => {
  const { language } = useLanguage();
  const { menuConfig, saveMenuConfig } = useMenuSettings();
  const { canEditItem } = usePagePermissions('/admin/menu-manager');
  const [sidebar, setSidebar] = useState<MenuItemConfig[]>(menuConfig.sidebar);
  const [publicMenu, setPublicMenu] = useState<MenuItemConfig[]>(menuConfig.public);
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, item: null, parentIdx: null, childIdx: null, type: 'sidebar' });
  const [editForm, setEditForm] = useState({ label_bn: '', label_en: '', icon: '' });

  const bn = language === 'bn';

  useEffect(() => {
    setSidebar(menuConfig.sidebar);
    setPublicMenu(menuConfig.public);
  }, [menuConfig]);

  const handleSave = () => {
    saveMenuConfig.mutate({ sidebar, public: publicMenu }, {
      onSuccess: () => toast.success(bn ? 'মেনু সেভ হয়েছে!' : 'Menu saved!'),
      onError: () => toast.error(bn ? 'সেভ করতে সমস্যা হয়েছে' : 'Failed to save'),
    });
  };

  const handleReset = () => {
    setSidebar(DEFAULT_MENU_CONFIG.sidebar);
    setPublicMenu(DEFAULT_MENU_CONFIG.public);
    toast.info(bn ? 'ডিফল্ট মেনুতে রিসেট হয়েছে' : 'Reset to default menu');
  };

  const moveItem = (list: MenuItemConfig[], idx: number, dir: -1 | 1): MenuItemConfig[] => {
    const newList = [...list];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newList.length) return newList;
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
    return newList.map((item, i) => ({ ...item, sort_order: i }));
  };

  const toggleVisibility = (list: MenuItemConfig[], idx: number): MenuItemConfig[] => {
    const newList = [...list];
    newList[idx] = { ...newList[idx], visible: !newList[idx].visible };
    return newList;
  };

  const openEdit = (item: MenuItemConfig, type: 'sidebar' | 'public', parentIdx: number, childIdx: number | null = null) => {
    setEditForm({ label_bn: item.label_bn, label_en: item.label_en, icon: item.icon });
    setEditDialog({ open: true, item, parentIdx, childIdx, type });
  };

  const saveEdit = () => {
    const { type, parentIdx, childIdx } = editDialog;
    if (parentIdx === null) return;

    if (type === 'sidebar') {
      setSidebar(prev => {
        const newList = [...prev];
        if (childIdx !== null && newList[parentIdx].children) {
          const children = [...newList[parentIdx].children!];
          children[childIdx] = { ...children[childIdx], ...editForm };
          newList[parentIdx] = { ...newList[parentIdx], children };
        } else {
          newList[parentIdx] = { ...newList[parentIdx], ...editForm };
        }
        return newList;
      });
    } else {
      setPublicMenu(prev => {
        const newList = [...prev];
        newList[parentIdx] = { ...newList[parentIdx], ...editForm };
        return newList;
      });
    }
    setEditDialog({ open: false, item: null, parentIdx: null, childIdx: null, type: 'sidebar' });
  };

  const MenuItemRow = ({ item, index, list, setList, type, isChild = false, parentIdx }: {
    item: MenuItemConfig; index: number; list: MenuItemConfig[];
    setList: React.Dispatch<React.SetStateAction<MenuItemConfig[]>>;
    type: 'sidebar' | 'public'; isChild?: boolean; parentIdx?: number;
  }) => (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-lg border border-border bg-card ${!item.visible ? 'opacity-50' : ''} ${isChild ? 'ml-8' : ''}`}>
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{bn ? item.label_bn : item.label_en}</p>
        <p className="text-xs text-muted-foreground">{item.path}</p>
      </div>
      {type === 'sidebar' && item.icon && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{item.icon}</span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => {
          if (isChild && parentIdx !== undefined) {
            openEdit(item, type, parentIdx, index);
          } else {
            openEdit(item, type, index);
          }
        }} className="p-1.5 rounded hover:bg-muted" title={bn ? 'সম্পাদনা' : 'Edit'}>
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => {
          if (isChild && parentIdx !== undefined) {
            setList(prev => {
              const newList = [...prev];
              const children = [...newList[parentIdx].children!];
              children[index] = { ...children[index], visible: !children[index].visible };
              newList[parentIdx] = { ...newList[parentIdx], children };
              return newList;
            });
          } else {
            setList(prev => toggleVisibility(prev, index));
          }
        }} className="p-1.5 rounded hover:bg-muted" title={item.visible ? (bn ? 'লুকান' : 'Hide') : (bn ? 'দেখান' : 'Show')}>
          {item.visible ? <Eye className="w-3.5 h-3.5 text-primary" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {!isChild && (
          <>
            <button onClick={() => setList(prev => moveItem(prev, index, -1))} disabled={index === 0}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setList(prev => moveItem(prev, index, 1))} disabled={index === list.length - 1}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              {bn ? '📋 মেনু ও নেভিগেশন ম্যানেজার' : '📋 Menu & Navigation Manager'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {bn ? 'সাইডবার ও পাবলিক মেনুর ক্রম, নাম, আইকন ও দৃশ্যমানতা পরিবর্তন করুন' : 'Change order, name, icon & visibility of sidebar and public menus'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
            </Button>
            {canEditItem && <Button size="sm" onClick={handleSave} disabled={saveMenuConfig.isPending}>
              <Save className="w-4 h-4 mr-1" />
              {saveMenuConfig.isPending ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'সেভ করুন' : 'Save')}
            </Button>}
          </div>
        </div>

        <Tabs defaultValue="sidebar">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="sidebar">{bn ? 'অ্যাডমিন সাইডবার' : 'Admin Sidebar'}</TabsTrigger>
            <TabsTrigger value="public">{bn ? 'পাবলিক মেনু' : 'Public Menu'}</TabsTrigger>
          </TabsList>

          <TabsContent value="sidebar" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bn ? 'সাইডবার মেনু আইটেম' : 'Sidebar Menu Items'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sidebar.map((item, idx) => (
                  <div key={item.id}>
                    <MenuItemRow item={item} index={idx} list={sidebar} setList={setSidebar} type="sidebar" />
                    {item.children && item.children.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {item.children.map((child, cidx) => (
                          <MenuItemRow key={child.id} item={child} index={cidx} list={item.children!} setList={setSidebar} type="sidebar" isChild parentIdx={idx} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="public" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bn ? 'পাবলিক ওয়েবসাইট মেনু' : 'Public Website Menu'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {publicMenu.map((item, idx) => (
                  <MenuItemRow key={item.id} item={item} index={idx} list={publicMenu} setList={setPublicMenu} type="public" />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => !open && setEditDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bn ? 'মেনু আইটেম সম্পাদনা' : 'Edit Menu Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{bn ? 'বাংলা নাম' : 'Bengali Name'}</Label>
              <Input value={editForm.label_bn} onChange={e => setEditForm(prev => ({ ...prev, label_bn: e.target.value }))} />
            </div>
            <div>
              <Label>{bn ? 'ইংরেজি নাম' : 'English Name'}</Label>
              <Input value={editForm.label_en} onChange={e => setEditForm(prev => ({ ...prev, label_en: e.target.value }))} />
            </div>
            {editDialog.type === 'sidebar' && (
              <div>
                <Label>{bn ? 'আইকন' : 'Icon'}</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setEditForm(prev => ({ ...prev, icon }))}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                        editForm.icon === icon ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:bg-muted'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(prev => ({ ...prev, open: false }))}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={saveEdit}>{bn ? 'সেভ করুন' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminMenuManager;
