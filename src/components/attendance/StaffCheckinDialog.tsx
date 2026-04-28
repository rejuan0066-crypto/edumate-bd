import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  QrCode, Fingerprint, CreditCard, Monitor, CheckCircle2,
  Loader2, UserCheck, Clock, LogIn, LogOut, Printer, Copy
} from 'lucide-react';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

const StaffCheckinDialog = ({ open, onOpenChange, selectedDate }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('staff_id');
  const [staffIdInput, setStaffIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; name: string; action: string; time: string } | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: institution } = useQuery({
    queryKey: ['institution-checkin'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    enabled: open,
  });

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  // Auto-reset result after 4 seconds
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setResult(null);
        setStaffIdInput('');
        inputRef.current?.focus();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  // Load recent check-ins for today
  useEffect(() => {
    if (open) {
      loadRecentCheckins();
    }
  }, [open, selectedDate]);

  const loadRecentCheckins = async () => {
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('attendance_date', selectedDate)
      .eq('entity_type', 'staff')
      .eq('shift', 'full_day')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      // Load staff names
      const staffIds = data.map(r => r.entity_id);
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, staff_id')
        .in('id', staffIds);
      
      const enriched = data.map(r => {
        const s = staffData?.find(st => st.id === r.entity_id);
        return { ...r, staff_name: s?.name_bn || s?.name_en || '-', staff_code: s?.staff_id || '-' };
      });
      setRecentCheckins(enriched);
    }
  };

  const handleCheckin = async () => {
    if (!staffIdInput.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data: staffMember, error: sErr } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, staff_id')
        .eq('staff_id', staffIdInput.trim())
        .eq('status', 'active')
        .maybeSingle();

      if (sErr || !staffMember) {
        toast.error(bn ? 'স্টাফ পাওয়া যায়নি!' : 'Staff not found!');
        setLoading(false);
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Check if already has record
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', selectedDate)
        .eq('entity_type', 'staff')
        .eq('entity_id', staffMember.id)
        .eq('shift', 'full_day')
        .maybeSingle();

      if (existing) {
        if (!existing.check_out_time) {
          // Check-out
          await supabase.from('attendance_records')
            .update({ check_out_time: timeStr })
            .eq('id', existing.id);
          
          setResult({
            success: true,
            name: staffMember.name_bn || staffMember.name_en || '-',
            action: 'checkout',
            time: timeStr,
          });
          toast.success(bn ? 'চেক-আউট সফল!' : 'Check-out successful!');
        } else {
          setResult({
            success: false,
            name: staffMember.name_bn || staffMember.name_en || '-',
            action: 'already',
            time: existing.check_in_time || '',
          });
          toast.info(bn ? 'ইতিমধ্যে চেক-ইন ও চেক-আউট হয়েছে' : 'Already checked in & out');
        }
      } else {
        // Check-in
        await supabase.from('attendance_records').insert({
          attendance_date: selectedDate,
          entity_type: 'staff',
          entity_id: staffMember.id,
          shift: 'full_day',
          status: 'present',
          check_in_time: timeStr,
        });

        setResult({
          success: true,
          name: staffMember.name_bn || staffMember.name_en || '-',
          action: 'checkin',
          time: timeStr,
        });
        toast.success(bn ? 'চেক-ইন সফল!' : 'Check-in successful!');
      }

      loadRecentCheckins();
      // Invalidate main attendance list so it reflects check-in/check-out
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    } catch (err: any) {
      console.error(err);
      toast.error(bn ? 'সমস্যা হয়েছে' : 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  // QR URL for staff checkin
  const baseUrl = window.location.origin;
  const staffCheckinUrl = `${baseUrl}/staff-checkin?date=${selectedDate}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(staffCheckinUrl);
    toast.success(bn ? 'লিংক কপি হয়েছে' : 'Link copied');
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Noto Sans Bengali',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff}
        .poster{text-align:center;padding:40px;max-width:400px}
        .poster h1{font-size:24px;margin-bottom:8px}
        .poster p{font-size:14px;color:#666;margin-bottom:20px}
        .qr{margin:20px auto}
        .date{font-size:16px;font-weight:600;margin-top:16px;color:#059669}
        .inst{font-size:12px;color:#999;margin-top:8px}
        @media print{body{padding:0}@page{margin:1cm}}
      </style></head><body>
      <div class="poster">
        <h1>${bn ? 'স্টাফ উপস্থিতি' : 'Staff Attendance'}</h1>
        <p>${bn ? 'QR কোড স্ক্যান করে উপস্থিতি দিন' : 'Scan QR to check in'}</p>
        <div class="qr" id="qr"></div>
        <p class="date">${bn ? 'তারিখ' : 'Date'}: ${selectedDate}</p>
        <p class="inst">${institution?.name || ''}</p>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
      <script>
        function tryQR(){
          if(typeof QRCode!=='undefined'){
            QRCode.toCanvas(document.createElement('canvas'),${JSON.stringify(staffCheckinUrl)},{width:250},function(err,canvas){
              if(!err){document.getElementById('qr').appendChild(canvas)}
              setTimeout(function(){window.print()},500);
            });
          } else { setTimeout(tryQR,200); }
        }
        tryQR();
      <\/script></body></html>`);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-600" />
            {bn ? 'স্টাফ চেক-ইন / চেক-আউট' : 'Staff Check-in / Check-out'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="w-full">
            <TabsTrigger value="staff_id" className="flex-1 text-xs">
              <CreditCard className="h-3.5 w-3.5 mr-1" />{bn ? 'স্টাফ আইডি' : 'Staff ID'}
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex-1 text-xs">
              <QrCode className="h-3.5 w-3.5 mr-1" />{bn ? 'QR কোড' : 'QR Code'}
            </TabsTrigger>
            <TabsTrigger value="device" className="flex-1 text-xs">
              <Fingerprint className="h-3.5 w-3.5 mr-1" />{bn ? 'ডিভাইস' : 'Device'}
            </TabsTrigger>
          </TabsList>

          {/* Staff ID Input Mode */}
          <TabsContent value="staff_id" className="space-y-4 mt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {bn ? 'স্টাফ আইডি নম্বর দিয়ে চেক-ইন/চেক-আউট করুন' : 'Enter Staff ID to check in/out'}
              </p>
              <p className="text-xs text-muted-foreground">
                {bn ? `তারিখ: ${selectedDate}` : `Date: ${selectedDate}`}
              </p>
            </div>

            {result ? (
              <div className={`text-center py-6 space-y-3 rounded-xl ${
                result.action === 'checkin' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                result.action === 'checkout' ? 'bg-blue-50 dark:bg-blue-900/20' :
                'bg-yellow-50 dark:bg-yellow-900/20'
              }`}>
                <CheckCircle2 className={`h-14 w-14 mx-auto animate-bounce ${
                  result.action === 'checkin' ? 'text-emerald-500' :
                  result.action === 'checkout' ? 'text-blue-500' : 'text-yellow-500'
                }`} />
                <h3 className="text-lg font-bold">{result.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  {result.action === 'checkin' ? (
                    <Badge className="bg-emerald-100 text-emerald-700"><LogIn className="h-3 w-3 mr-1" />{bn ? 'চেক-ইন' : 'Check-in'}</Badge>
                  ) : result.action === 'checkout' ? (
                    <Badge className="bg-blue-100 text-blue-700"><LogOut className="h-3 w-3 mr-1" />{bn ? 'চেক-আউট' : 'Check-out'}</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700">{bn ? 'ইতিমধ্যে সম্পন্ন' : 'Already done'}</Badge>
                  )}
                  <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{result.time}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {bn ? '৪ সেকেন্ডে রিসেট হবে...' : 'Resetting in 4s...'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  ref={inputRef}
                  value={staffIdInput}
                  onChange={e => setStaffIdInput(e.target.value)}
                  placeholder={bn ? 'স্টাফ আইডি লিখুন (যেমন: TCH-2025-2001)' : 'Enter Staff ID (e.g. TCH-2025-2001)'}
                  className="text-center text-lg h-12"
                  onKeyDown={e => e.key === 'Enter' && handleCheckin()}
                  autoFocus
                />
                <Button className="w-full h-11" onClick={handleCheckin} disabled={loading || !staffIdInput.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                  {bn ? 'চেক-ইন / চেক-আউট' : 'Check-in / Check-out'}
                </Button>
              </div>
            )}

            {/* Recent check-ins */}
            {recentCheckins.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{bn ? 'সাম্প্রতিক চেক-ইন' : 'Recent Check-ins'}</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {recentCheckins.map((r, i) => (
                    <div key={r.id || i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{r.staff_code}</Badge>
                        <span className="font-medium">{r.staff_name}</span>
                      </div>
                      <div className="flex gap-1">
                        {r.check_in_time && <Badge className="bg-emerald-100 text-emerald-700 text-[9px]"><LogIn className="h-2.5 w-2.5 mr-0.5" />{r.check_in_time}</Badge>}
                        {r.check_out_time && <Badge className="bg-blue-100 text-blue-700 text-[9px]"><LogOut className="h-2.5 w-2.5 mr-0.5" />{r.check_out_time}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* QR Code Mode */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {bn ? 'এই QR কোড প্রিন্ট করে গেটে লাগান। স্টাফরা ফোন দিয়ে স্ক্যান করে চেক-ইন দিতে পারবেন।' :
                  'Print this QR and place at gate. Staff scan with phone to check in.'}
              </p>
              
              <div className="flex justify-center py-4">
                <div className="p-4 bg-white rounded-2xl shadow-lg border">
                  <QRCodeSVG value={staffCheckinUrl} size={200} level="H" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground break-all px-4">{staffCheckinUrl}</p>

              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={copyUrl}>
                  <Copy className="h-3.5 w-3.5 mr-1" />{bn ? 'লিংক কপি' : 'Copy Link'}
                </Button>
                <Button size="sm" onClick={printQR}>
                  <Printer className="h-3.5 w-3.5 mr-1" />{bn ? 'QR প্রিন্ট' : 'Print QR'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Device Mode */}
          <TabsContent value="device" className="space-y-4 mt-4">
            <div className="text-center space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Fingerprint, label: bn ? 'ফিঙ্গারপ্রিন্ট' : 'Fingerprint', desc: bn ? 'বায়োমেট্রিক ডিভাইস' : 'Biometric device' },
                  { icon: QrCode, label: bn ? 'QR স্ক্যানার' : 'QR Scanner', desc: bn ? 'ডেডিকেটেড স্ক্যানার' : 'Dedicated scanner' },
                  { icon: CreditCard, label: bn ? 'কার্ড রিডার' : 'Card Reader', desc: bn ? 'RFID/NFC কার্ড' : 'RFID/NFC card' },
                  { icon: Monitor, label: bn ? 'ফেস রিকগনিশন' : 'Face Recognition', desc: bn ? 'ক্যামেরা ভিত্তিক' : 'Camera based' },
                ].map((d, i) => (
                  <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 text-center">
                      <d.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-sm font-semibold">{d.label}</p>
                      <p className="text-[10px] text-muted-foreground">{d.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">{bn ? 'ডিভাইস ইন্টিগ্রেশন' : 'Device Integration'}</p>
                <p className="text-xs">
                  {bn 
                    ? 'বাইরের হার্ডওয়্যার ডিভাইস (ফিঙ্গারপ্রিন্ট/ফেস রিকগনিশন/কার্ড রিডার) কানেক্ট করতে "হার্ডওয়্যার ডিভাইস" সেকশন থেকে ডিভাইসের IP, পোর্ট ও মডেল কনফিগার করুন। ডিভাইস থেকে স্বয়ংক্রিয়ভাবে ডাটা সিঙ্ক হবে।'
                    : 'To connect external hardware (fingerprint/face/card reader), configure device IP, port & model from "Hardware Devices" section. Data will auto-sync from devices.'}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                {bn ? 'বর্তমানে স্টাফ আইডি বা QR কোড মোড ব্যবহার করুন' : 'Currently use Staff ID or QR Code mode'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StaffCheckinDialog;
