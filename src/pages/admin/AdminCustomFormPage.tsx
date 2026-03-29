import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import { FileText, Send, List, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

const AdminCustomFormPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const queryClient = useQueryClient();

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [permanentAddr, setPermanentAddr] = useState<AddressData>({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
  const [presentAddr, setPresentAddr] = useState<AddressData>({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('form');

  const { data: form } = useQuery({
    queryKey: ['custom-form-by-slug', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_forms').select('*').eq('menu_slug', slug).single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['custom-form-fields-slug', form?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('custom_form_fields').select('*').eq('form_id', form!.id).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!form?.id,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['custom-form-submissions', form?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_form_submissions')
        .select('*')
        .eq('form_id', form!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!form?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const allData: Record<string, any> = { ...formValues };
      // Add address data if applicable
      if (fields.some(f => f.field_type === 'address_permanent')) {
        allData['address_permanent'] = permanentAddr;
      }
      if (fields.some(f => f.field_type === 'address_present')) {
        allData['address_present'] = presentAddr;
      }
      
      const { error } = await supabase.from('custom_form_submissions').insert({
        form_id: form!.id,
        data: allData as unknown as Json,
        submitted_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-form-submissions', form?.id] });
      setFormValues({});
      setPermanentAddr({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
      setPresentAddr({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
      toast.success(bn ? 'সফলভাবে সাবমিট হয়েছে!' : 'Submitted successfully!');
    },
    onError: () => toast.error(bn ? 'সাবমিট করতে সমস্যা হয়েছে' : 'Failed to submit'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_form_submissions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-form-submissions', form?.id] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
  });

  const updateValue = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = () => {
    // Check required fields
    const requiredFields = fields.filter(f => f.is_required && f.is_active);
    for (const field of requiredFields) {
      if (!formValues[field.id] || (typeof formValues[field.id] === 'string' && !formValues[field.id].trim())) {
        toast.error(bn ? `"${field.label_bn}" আবশ্যক` : `"${field.label}" is required`);
        return;
      }
    }
    submitMutation.mutate();
  };

  if (!form) {
    return (
      <AdminLayout>
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{bn ? 'ফর্ম পাওয়া যায়নি' : 'Form not found'}</p>
        </CardContent></Card>
      </AdminLayout>
    );
  }

  const activeFields = fields.filter(f => f.is_active);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{bn ? form.name_bn : form.name}</h1>
            {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
          </div>
          <Badge variant="outline">{submissions.length} {bn ? 'টি সাবমিশন' : ' submissions'}</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="form"><Send className="h-3.5 w-3.5 mr-1" />{bn ? 'ফর্ম' : 'Form'}</TabsTrigger>
            <TabsTrigger value="submissions"><List className="h-3.5 w-3.5 mr-1" />{bn ? 'সাবমিশন' : 'Submissions'} ({submissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <Card>
              <CardContent className="p-6 space-y-4">
                {activeFields.map(field => {
                  let opts: string[] = [];
                  try { opts = typeof field.options === 'string' ? JSON.parse(field.options as string) : (Array.isArray(field.options) ? (field.options as string[]) : []); } catch { opts = []; }
                  const value = formValues[field.id] || '';
                  return (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="flex items-center gap-1">
                        {bn ? field.label_bn : field.label}
                        {field.is_required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.field_type === 'text' && <Input placeholder={field.placeholder || ''} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'email' && <Input type="email" placeholder={field.placeholder || ''} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'phone' && <Input type="tel" placeholder={field.placeholder || ''} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'number' && <Input type="number" placeholder={field.placeholder || ''} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'textarea' && <Textarea placeholder={field.placeholder || ''} rows={3} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'date' && <Input type="date" value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'file' && <Input type="file" onChange={e => updateValue(field.id, e.target.files?.[0]?.name || '')} />}
                      {field.field_type === 'switch' && <Switch checked={!!value} onCheckedChange={c => updateValue(field.id, c)} />}
                      {field.field_type === 'post_office' && <Input placeholder={bn ? 'পোস্ট অফিস লিখুন' : 'Enter post office'} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'village' && <Input placeholder={bn ? 'গ্রাম লিখুন' : 'Enter village'} value={value} onChange={e => updateValue(field.id, e.target.value)} />}
                      {field.field_type === 'address_permanent' && (
                        <AddressFields label={bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'} value={permanentAddr} onChange={(data) => { setPermanentAddr(data); if (sameAsPermanent) setPresentAddr(data); }} />
                      )}
                      {field.field_type === 'address_present' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={sameAsPermanent} onCheckedChange={(c) => { setSameAsPermanent(!!c); if (c) setPresentAddr({ ...permanentAddr }); }} />
                            <Label className="text-sm font-normal cursor-pointer">{bn ? 'স্থায়ী ঠিকানার মতো একই' : 'Same as Permanent Address'}</Label>
                          </div>
                          <AddressFields label={bn ? 'বর্তমান ঠিকানা' : 'Present Address'} value={presentAddr} onChange={setPresentAddr} disabled={sameAsPermanent} />
                        </div>
                      )}
                      {field.field_type === 'select' && (
                        <Select value={value} onValueChange={v => updateValue(field.id, v)}>
                          <SelectTrigger><SelectValue placeholder={field.placeholder || (bn ? 'নির্বাচন করুন' : 'Select...')} /></SelectTrigger>
                          <SelectContent>{opts.map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      {field.field_type === 'radio' && (
                        <div className="flex flex-wrap gap-3">{opts.map((opt, i) => (
                          <label key={i} className="flex items-center gap-1.5 text-sm">
                            <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={() => updateValue(field.id, opt)} className="accent-primary" />{opt}
                          </label>
                        ))}</div>
                      )}
                      {field.field_type === 'checkbox' && (
                        <div className="flex flex-wrap gap-3">{opts.map((opt, i) => {
                          const checked = Array.isArray(value) ? value.includes(opt) : false;
                          return (
                            <label key={i} className="flex items-center gap-1.5 text-sm">
                              <input type="checkbox" value={opt} checked={checked} onChange={e => {
                                const arr = Array.isArray(value) ? [...value] : [];
                                if (e.target.checked) arr.push(opt); else { const idx = arr.indexOf(opt); if (idx > -1) arr.splice(idx, 1); }
                                updateValue(field.id, arr);
                              }} className="accent-primary" />{opt}
                            </label>
                          );
                        })}</div>
                      )}
                    </div>
                  );
                })}
                {activeFields.length > 0 && (
                  <Button className="w-full mt-4" onClick={handleSubmit} disabled={submitMutation.isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    {submitMutation.isPending ? (bn ? 'সাবমিট হচ্ছে...' : 'Submitting...') : (bn ? 'সাবমিট করুন' : 'Submit')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bn ? 'সাবমিশন তালিকা' : 'Submissions List'}</CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{bn ? 'কোনো সাবমিশন নেই' : 'No submissions yet'}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead className="text-right">{bn ? 'অ্যাকশন' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((sub: any, idx: number) => (
                        <TableRow key={sub.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="text-sm">{new Date(sub.created_at).toLocaleDateString('bn-BD')}</TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'submitted' ? 'default' : 'secondary'} className="text-xs">
                              {sub.status === 'submitted' ? (bn ? 'সাবমিটেড' : 'Submitted') : sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewSubmission(sub)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              onClick={() => { if (confirm(bn ? 'মুছে ফেলতে চান?' : 'Delete?')) deleteMutation.mutate(sub.id); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Submission Dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={o => !o && setViewSubmission(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{bn ? 'সাবমিশন বিস্তারিত' : 'Submission Details'}</DialogTitle>
          </DialogHeader>
          {viewSubmission && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {bn ? 'তারিখ' : 'Date'}: {new Date(viewSubmission.created_at).toLocaleString('bn-BD')}
              </p>
              {Object.entries(viewSubmission.data || {}).map(([key, val]) => {
                const field = fields.find(f => f.id === key);
                const label = field ? (bn ? field.label_bn : field.label) : key;
                const displayVal = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
                return (
                  <div key={key} className="border-b border-border pb-2">
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{displayVal}</p>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCustomFormPage;
