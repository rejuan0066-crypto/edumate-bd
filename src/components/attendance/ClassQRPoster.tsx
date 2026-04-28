import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, QrCode } from 'lucide-react';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

interface ClassQRPosterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClassQRPoster = ({ open, onOpenChange }: ClassQRPosterProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [selectedClassId, setSelectedClassId] = useState('');
  const posterRef = useRef<HTMLDivElement>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-qr'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      return data || [];
    },
    enabled: open,
  });

  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    enabled: open,
  });

  const selectedClass = classes.find((c: any) => c.id === selectedClassId);
  const today = new Date().toISOString().split('T')[0];

  // Generate check-in URL
  const baseUrl = window.location.origin;
  const checkinUrl = selectedClassId
    ? `${baseUrl}/attendance-checkin?class=${selectedClassId}&date=${today}`
    : '';

  const handlePrint = () => {
    if (!posterRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>QR Attendance</title>
      <style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; }
        .poster { text-align:center; padding:40px; max-width:500px; }
        .poster img.logo { height:60px; margin-bottom:12px; }
        .poster h1 { font-size:22px; margin-bottom:4px; }
        .poster h2 { font-size:16px; color:#555; margin-bottom:4px; }
        .poster .class-name { font-size:28px; font-weight:700; color:#1e40af; margin:16px 0 8px; }
        .poster .date { font-size:14px; color:#666; margin-bottom:20px; }
        .poster .qr-wrap { display:inline-block; padding:16px; border:3px solid #1e40af; border-radius:16px; margin-bottom:16px; }
        .poster .instructions { font-size:13px; color:#555; line-height:1.8; }
        .poster .instructions strong { color:#1e40af; }
        @media print { body { padding:0; } }
      </style>
    </head><body>
      <div class="poster">
        ${institution?.logo_url ? `<img class="logo" src="${institution.logo_url}" alt="logo">` : ''}
        <h1>${institution?.name || ''}</h1>
        ${institution?.name_en ? `<h2>${institution.name_en}</h2>` : ''}
        <div class="class-name">${bn ? (selectedClass as any)?.name_bn : (selectedClass as any)?.name || ''}</div>
        <div class="date">${bn ? 'তারিখ' : 'Date'}: ${today}</div>
        <div class="qr-wrap">
          ${posterRef.current?.querySelector('svg')?.outerHTML || ''}
        </div>
        <div class="instructions">
          <p><strong>${bn ? 'নির্দেশনা:' : 'Instructions:'}</strong></p>
          <p>${bn ? '১. মোবাইল দিয়ে QR কোড স্ক্যান করুন' : '1. Scan the QR code with your mobile'}</p>
          <p>${bn ? '২. আপনার ছাত্র আইডি দিন' : '2. Enter your Student ID'}</p>
          <p>${bn ? '৩. উপস্থিতি নিশ্চিত করুন' : '3. Confirm your attendance'}</p>
        </div>
      </div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {bn ? 'QR উপস্থিতি পোস্টার' : 'QR Attendance Poster'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger>
              <SelectValue placeholder={bn ? 'শ্রেণী নির্বাচন করুন' : 'Select a class'} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {bn ? c.name_bn : c.name} {c.divisions ? `(${bn ? c.divisions.name_bn : c.divisions.name})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClassId && (
            <>
              <Card>
                <CardContent className="p-6 text-center" ref={posterRef}>
                  {institution?.logo_url && (
                    <img src={institution.logo_url} alt="logo" className="h-12 mx-auto mb-2" />
                  )}
                  <h3 className="font-bold text-lg">{institution?.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-3">
                    {bn ? (selectedClass as any)?.name_bn : (selectedClass as any)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {bn ? 'তারিখ' : 'Date'}: {today}
                  </p>
                  <div className="inline-block p-4 border-2 border-primary rounded-xl">
                    <QRCodeSVG value={checkinUrl} size={200} level="H" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {bn ? 'মোবাইল দিয়ে স্ক্যান করে উপস্থিতি দিন' : 'Scan with mobile to mark attendance'}
                  </p>
                </CardContent>
              </Card>
              <Button className="w-full" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {bn ? 'পোস্টার প্রিন্ট করুন' : 'Print Poster'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassQRPoster;
