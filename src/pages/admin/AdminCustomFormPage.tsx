import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import AddressFields, { type AddressData } from '@/components/AddressFields';
import { FileText } from 'lucide-react';

const AdminCustomFormPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [permanentAddr, setPermanentAddr] = useState<AddressData>({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
  const [presentAddr, setPresentAddr] = useState<AddressData>({ division: '', district: '', upazila: '', union: '', postOffice: '', village: '' });
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

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

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{bn ? form.name_bn : form.name}</h1>
          {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {fields.filter(f => f.is_active).map(field => {
              let opts: string[] = [];
              try { opts = typeof field.options === 'string' ? JSON.parse(field.options as string) : (Array.isArray(field.options) ? (field.options as string[]) : []); } catch { opts = []; }
              return (
                <div key={field.id} className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {bn ? field.label_bn : field.label}
                    {field.is_required && <span className="text-destructive">*</span>}
                  </Label>
                  {field.field_type === 'text' && <Input placeholder={field.placeholder || ''} defaultValue={field.default_value || ''} />}
                  {field.field_type === 'email' && <Input type="email" placeholder={field.placeholder || ''} />}
                  {field.field_type === 'phone' && <Input type="tel" placeholder={field.placeholder || ''} />}
                  {field.field_type === 'number' && <Input type="number" placeholder={field.placeholder || ''} />}
                  {field.field_type === 'textarea' && <Textarea placeholder={field.placeholder || ''} rows={3} />}
                  {field.field_type === 'date' && <Input type="date" />}
                  {field.field_type === 'file' && <Input type="file" />}
                  {field.field_type === 'switch' && <Switch />}
                  {field.field_type === 'post_office' && <Input placeholder={bn ? 'পোস্ট অফিস লিখুন' : 'Enter post office'} />}
                  {field.field_type === 'village' && <Input placeholder={bn ? 'গ্রাম লিখুন' : 'Enter village'} />}
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
                    <Select><SelectTrigger><SelectValue placeholder={field.placeholder || (bn ? 'নির্বাচন করুন' : 'Select...')} /></SelectTrigger>
                      <SelectContent>{opts.map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {field.field_type === 'radio' && (
                    <div className="flex flex-wrap gap-3">{opts.map((opt, i) => (
                      <label key={i} className="flex items-center gap-1.5 text-sm"><input type="radio" name={field.id} value={opt} className="accent-primary" />{opt}</label>
                    ))}</div>
                  )}
                  {field.field_type === 'checkbox' && (
                    <div className="flex flex-wrap gap-3">{opts.map((opt, i) => (
                      <label key={i} className="flex items-center gap-1.5 text-sm"><input type="checkbox" value={opt} className="accent-primary" />{opt}</label>
                    ))}</div>
                  )}
                </div>
              );
            })}
            {fields.filter(f => f.is_active).length > 0 && (
              <Button className="w-full mt-4">{bn ? 'সাবমিট করুন' : 'Submit'}</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomFormPage;
