import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useResultSecurity } from '@/hooks/useResultSecurity';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResultSecuritySettings({ open, onOpenChange }: Props) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { config, isLoading, saveSecurityConfig, isSaving } = useResultSecurity();

  const [masterEnabled, setMasterEnabled] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [lockPublished, setLockPublished] = useState(true);
  const [allowAdminDirect, setAllowAdminDirect] = useState(true);

  useEffect(() => {
    if (open) {
      setMasterEnabled(config.enabled);
      setRequireApproval(config.require_approval);
      setLockPublished(config.lock_published);
      setAllowAdminDirect(config.allow_admin_direct);
    }
  }, [open, config]);

  const handleSave = async () => {
    try {
      await saveSecurityConfig({
        enabled: masterEnabled,
        require_approval: requireApproval,
        lock_published: lockPublished,
        allow_admin_direct: allowAdminDirect,
      });
      toast.success(bn ? 'রেজাল্ট সুরক্ষা সেটিং সংরক্ষিত হয়েছে' : 'Result security settings saved');
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || (bn ? 'সেটিং সংরক্ষণে ত্রুটি' : 'Failed to save settings'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[28px] p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">
              {bn ? 'রেজাল্ট সুরক্ষা ও অনুমোদন সেটিং' : 'Result Security & Approval'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {bn
              ? 'নম্বর এন্ট্রি অনুমোদন, পাবলিশড ফলাফল লক এবং অননুমোদিত পরিবর্তন থেকে রেজাল্ট সুরক্ষিত রাখার নিয়ন্ত্রণ।'
              : 'Control marks submission approval, published result freezing, and unauthorized tampering.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Master Switch */}
            <div className={`p-4 rounded-2xl border transition-all ${
              masterEnabled
                ? 'bg-primary/10 border-primary/30 shadow-sm'
                : 'bg-muted/30 border-border'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="master-security" className="text-sm font-bold text-foreground cursor-pointer">
                      {bn ? 'রেজাল্ট সুরক্ষা ব্যবস্থা' : 'Result Protection System'}
                    </Label>
                    <Badge variant={masterEnabled ? 'default' : 'outline'} className="text-[10px] px-2 py-0">
                      {masterEnabled ? (bn ? 'সক্রিয়' : 'Enabled') : (bn ? 'নিষ্ক্রিয়' : 'Disabled')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {bn
                      ? 'চালু থাকলে রেজাল্ট এন্ট্রি ও সংশোধনে নিরাপত্তা নীতি কার্যকর হবে।'
                      : 'When enabled, approval workflow and locking rules take effect.'}
                  </p>
                </div>
                <Switch
                  id="master-security"
                  checked={masterEnabled}
                  onCheckedChange={setMasterEnabled}
                />
              </div>
            </div>

            {/* Sub-options */}
            <div className={`space-y-3 transition-opacity ${masterEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              {/* Option 1: Approval required */}
              <div className="p-3.5 rounded-xl border bg-card/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <Label htmlFor="req-approval" className="text-xs sm:text-sm font-semibold cursor-pointer">
                      {bn ? 'নম্বর এন্ট্রি ও সংশোধনে অ্যাডমিন অনুমোদন' : 'Require Admin Approval for Marks'}
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {bn
                      ? 'সহকারী শিক্ষক বা পরীক্ষক নম্বর দিলে সরাসরি সেভ হবে না। "অনুমোদন প্রযোজ্য — অনুমোদন করার পর কার্যকর হবে" হিসেবে অ্যাডমিন প্যানেলে জমা থাকবে।'
                      : 'Assistant teachers or examiners cannot directly alter live results. Changes stay in pending approval queue.'}
                  </p>
                </div>
                <Switch
                  id="req-approval"
                  disabled={!masterEnabled}
                  checked={requireApproval}
                  onCheckedChange={setRequireApproval}
                />
              </div>

              {/* Option 2: Lock published results */}
              <div className="p-3.5 rounded-xl border bg-card/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <Label htmlFor="lock-pub" className="text-xs sm:text-sm font-semibold cursor-pointer">
                      {bn ? 'পাবলিশড ফলাফল স্বয়ংক্রিয় লক (Read-Only)' : 'Auto-Lock Published Results'}
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {bn
                      ? 'ফলাফল একবার পাবলিশ করা হলে সাধারণ শিক্ষকদের জন্য পুরো শিটটি লক থাকবে, যাতে ভুলবশতও কোনো নম্বর বদলানো না যায়।'
                      : 'Once a class result is published, the sheet becomes strictly Read-Only for non-admin staff.'}
                  </p>
                </div>
                <Switch
                  id="lock-pub"
                  disabled={!masterEnabled}
                  checked={lockPublished}
                  onCheckedChange={setLockPublished}
                />
              </div>

              {/* Option 3: Admin direct save */}
              <div className="p-3.5 rounded-xl border bg-card/60 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                    <Label htmlFor="admin-direct" className="text-xs sm:text-sm font-semibold cursor-pointer">
                      {bn ? 'অ্যাডমিন ও মুহতামিমের সরাসরি সেভ' : 'Admins Save Directly (Exempt)'}
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {bn
                      ? 'মুহতামিম, পরীক্ষা নিয়ন্ত্রক ও সুপার অ্যাডমিন অনুমোদনের অপেক্ষা ছাড়াই সরাসরি রেজাল্ট প্রস্তুত ও সংশোধন করতে পারবেন।'
                      : 'Principals, exam controllers, and super admins can save and edit marks directly without approval delays.'}
                  </p>
                </div>
                <Switch
                  id="admin-direct"
                  disabled={!masterEnabled}
                  checked={allowAdminDirect}
                  onCheckedChange={setAllowAdminDirect}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {bn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="btn-primary-gradient">
            {isSaving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {bn ? 'সংরক্ষণ করুন' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
