import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const AdminAcademicSessions = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['academic-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error(language === 'bn' ? 'সেশনের নাম দিন' : 'Enter session name');
      if (editId) {
        const { error } = await supabase.from('academic_sessions').update({ name: name.trim(), is_active: isActive }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('academic_sessions').insert({ name: name.trim(), is_active: isActive });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-sessions'] });
      toast.success(language === 'bn' ? 'সংরক্ষিত হয়েছে' : 'Saved successfully');
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('academic_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-sessions'] });
      toast.success(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('academic_sessions').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-sessions'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditId(null);
    setName('');
    setIsActive(true);
  };

  const openEdit = (session: any) => {
    setEditId(session.id);
    setName(session.name);
    setIsActive(session.is_active);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            {language === 'bn' ? 'একাডেমিক সেশন' : 'Academic Sessions'}
          </h1>
          <Button className="btn-primary-gradient" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />
            {language === 'bn' ? 'নতুন সেশন' : 'New Session'}
          </Button>
        </div>

        <div className="card-elevated">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              {language === 'bn' ? 'কোনো সেশন নেই। নতুন সেশন যোগ করুন।' : 'No sessions yet. Add a new session.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'bn' ? 'সেশন নাম' : 'Session Name'}</TableHead>
                  <TableHead className="text-center">{language === 'bn' ? 'সক্রিয়' : 'Active'}</TableHead>
                  <TableHead className="text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: s.id, active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {language === 'bn' ? `"${s.name}" সেশনটি মুছে ফেলতে চান?` : `Delete session "${s.name}"?`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {language === 'bn' ? 'মুছুন' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editId
                  ? (language === 'bn' ? 'সেশন সম্পাদনা' : 'Edit Session')
                  : (language === 'bn' ? 'নতুন সেশন তৈরি' : 'Create New Session')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  {language === 'bn' ? 'সেশন নাম' : 'Session Name'}
                </label>
                <Input
                  placeholder={language === 'bn' ? 'যেমন: 2025, 2025-26' : 'e.g. 2025, 2025-26'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span className="text-sm text-foreground">{language === 'bn' ? 'সক্রিয়' : 'Active'}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
              <Button className="btn-primary-gradient" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {language === 'bn' ? 'সংরক্ষণ' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAcademicSessions;
