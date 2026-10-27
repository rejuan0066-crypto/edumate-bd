import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import {
  Loader2, MessageCircle, Save, ExternalLink, Phone, Send, CheckCircle2,
  XCircle, QrCode, RefreshCw, Sparkles, HelpCircle, ShieldCheck, Zap
} from 'lucide-react';
import { buildWhatsAppUrl } from '@/hooks/useWhatsAppConfig';

const WhatsAppSettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['whatsapp-config-admin'],
    queryFn: async () => {
      const { data } = await supabase.from('whatsapp_config').select('*').limit(1).maybeSingle();
      return data;
    },
  });

  const [form, setForm] = useState({
    phone_number: '',
    welcome_message: '',
    button_label: '',
    show_floating_button: true,
    button_position: 'bottom-right' as 'bottom-right' | 'bottom-left',
    business_hours: '',
    away_message: '',
    cloud_api_enabled: false,
    phone_number_id: '',
    business_account_id: '',
    default_language: 'bn',
    route_mode: 'deny' as 'deny' | 'allow',
    route_patterns: [] as string[],
  });

  // Free Gateway Settings (stored in app_settings table)
  const [freeGateway, setFreeGateway] = useState({
    is_enabled: true,
    provider: 'evolution', // 'evolution' | 'baileys' | 'wppconnect' | 'android'
    server_url: '',
    instance_name: 'madrasa_main',
    api_key: '',
  });

  const [routePatternsText, setRoutePatternsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Test sender
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState(
    bn ? 'আসসালামু আলাইকুম, এটি আল আরাবিয়া সুবহানিয়া মাদ্রাসার টেস্ট WhatsApp মেসেজ।' : 'This is a test WhatsApp message from Al-Arabia Subhania Madrasa.'
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; messageId?: string; error?: string; sentAt?: string; method?: string } | null>(null);

  // Load free gateway from app_settings
  useEffect(() => {
    async function loadGatewayConfig() {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'whatsapp_gateway_config')
          .maybeSingle();

        if (data?.value && typeof data.value === 'object') {
          const val = data.value as any;
          setFreeGateway({
            is_enabled: val.is_enabled ?? true,
            provider: val.provider || 'evolution',
            server_url: val.server_url || '',
            instance_name: val.instance_name || 'madrasa_main',
            api_key: val.api_key || '',
          });
        }
      } catch (err) {
        console.error('Error loading gateway config:', err);
      }
    }
    loadGatewayConfig();
  }, []);

  useEffect(() => {
    if (config) {
      const cfg: any = config;
      const patterns: string[] = Array.isArray(cfg.route_patterns) ? cfg.route_patterns : [];
      setForm({
        phone_number: config.phone_number || '',
        welcome_message: config.welcome_message || '',
        button_label: config.button_label || '',
        show_floating_button: config.show_floating_button ?? true,
        button_position: (config.button_position as any) || 'bottom-right',
        business_hours: config.business_hours || '',
        away_message: config.away_message || '',
        cloud_api_enabled: config.cloud_api_enabled ?? false,
        phone_number_id: config.phone_number_id || '',
        business_account_id: config.business_account_id || '',
        default_language: config.default_language || 'bn',
        route_mode: (cfg.route_mode === 'allow' ? 'allow' : 'deny'),
        route_patterns: patterns,
      });
      setRoutePatternsText(patterns.join('\n'));
    }
  }, [config]);

  // Phone validation
  const validatePhone = (raw: string): string | null => {
    const v = (raw || '').trim();
    if (!v) return bn ? 'ফোন নম্বর দিন' : 'Phone number is required';
    if (/[^\d+\s\-()]/.test(v)) return bn ? 'শুধু ডিজিট, +, স্পেস, -, () ব্যবহার করুন' : 'Only digits, +, space, -, () allowed';
    const digits = v.replace(/\D/g, '');
    const hasPlus = v.trim().startsWith('+');
    if (hasPlus) {
      if (digits.length < 10 || digits.length > 15) {
        return bn ? 'ইন্টারন্যাশনাল ফরম্যাট ভুল (১০–১৫ ডিজিট হতে হবে)' : 'Invalid international format (must be 10–15 digits)';
      }
    } else {
      if (digits.length !== 11 || !digits.startsWith('01')) {
        return bn
          ? 'লোকাল নম্বর ১১ ডিজিটের হতে হবে এবং ০১ দিয়ে শুরু (অথবা +কান্ট্রি কোডসহ দিন)'
          : 'Local number must be 11 digits starting with 01 (or use + with country code)';
      }
    }
    return null;
  };

  const phoneError = validatePhone(form.phone_number);

  const handleSave = async () => {
    const err = validatePhone(form.phone_number);
    if (err) {
      toast({ title: bn ? 'ফোন নম্বর ভুল' : 'Invalid phone number', description: err, variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const parsedPatterns = routePatternsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.startsWith('/'));
      const payload: any = { ...form, route_patterns: parsedPatterns };

      if (config?.id) {
        const { error } = await supabase.from('whatsapp_config').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('whatsapp_config').insert(payload);
        if (error) throw error;
      }

      // Save Free Gateway Settings in app_settings
      const { error: gwErr } = await supabase.from('app_settings').upsert({
        key: 'whatsapp_gateway_config',
        value: freeGateway,
        description: 'Free WhatsApp Gateway settings (Evolution API / Baileys)',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      if (gwErr) console.warn('Could not save gateway config to app_settings:', gwErr);

      qc.invalidateQueries({ queryKey: ['whatsapp-config'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-config-admin'] });
      toast({ title: bn ? 'সেটিংস সংরক্ষিত হয়েছে' : 'Settings saved successfully' });
    } catch (err: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Check Free Gateway Connection Status
  const handleCheckConnection = async () => {
    if (!freeGateway.server_url.trim()) {
      toast({ title: bn ? 'গেটওয়ে সার্ভার URL দিন' : 'Enter Gateway Server URL', variant: 'destructive' });
      return;
    }
    setCheckingStatus(true);
    setStatusMessage('');
    try {
      const sUrl = freeGateway.server_url.replace(/\/+$/, '');
      const instance = freeGateway.instance_name.trim() || 'madrasa_main';
      const headers: Record<string, string> = {};
      if (freeGateway.api_key) headers['apikey'] = freeGateway.api_key;

      const resp = await fetch(`${sUrl}/instance/connectionState/${encodeURIComponent(instance)}`, { headers });
      const data = await resp.json().catch(() => ({}));
      
      const state = data?.instance?.state || data?.state;
      if (state === 'open' || state === 'connected') {
        setConnectionStatus('connected');
        setStatusMessage(bn ? '✅ সংযুক্ত (Connected)! নম্বরটি সক্রিয় আছে।' : 'Connected! Number is active.');
      } else {
        setConnectionStatus('disconnected');
        setStatusMessage(bn ? '⚠️ সংযোগ বিচ্ছিন্ন (Disconnected) অথবা QR কোড স্ক্যান প্রয়োজন।' : 'Disconnected. QR scan needed.');
      }
    } catch (e: any) {
      setConnectionStatus('error');
      setStatusMessage(bn ? `সার্ভারে সংযোগ ব্যর্থ: ${e.message}` : `Connection failed: ${e.message}`);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Open QR Connect Dialog
  const handleOpenQrModal = async () => {
    setQrModalOpen(true);
    if (!freeGateway.server_url.trim()) return;

    setLoadingQr(true);
    setQrCodeData(null);
    try {
      const sUrl = freeGateway.server_url.replace(/\/+$/, '');
      const instance = freeGateway.instance_name.trim() || 'madrasa_main';
      const headers: Record<string, string> = {};
      if (freeGateway.api_key) headers['apikey'] = freeGateway.api_key;

      const resp = await fetch(`${sUrl}/instance/connect/${encodeURIComponent(instance)}`, { headers });
      const data = await resp.json().catch(() => ({}));
      
      if (data?.base64) {
        setQrCodeData(data.base64);
      } else if (data?.code) {
        const QRCodeModule = await import('qrcode');
        const QRCode = (QRCodeModule as any).default || QRCodeModule;
        const url = await QRCode.toDataURL(data.code, { width: 220, margin: 1 });
        setQrCodeData(url);
      } else if (data?.pairingCode) {
        setQrCodeData(data.pairingCode);
      }
    } catch (err) {
      console.error('Error fetching QR:', err);
    } finally {
      setLoadingQr(false);
    }
  };

  // Test WhatsApp message
  const handleTest = async () => {
    if (!testPhone.trim()) {
      toast({ title: bn ? 'ফোন নম্বর দিন' : 'Enter a phone number', variant: 'destructive' });
      return;
    }
    if (!testMessage.trim()) {
      toast({ title: bn ? 'মেসেজ দিন' : 'Enter a message', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { recipients: [testPhone.trim()], message: testMessage.trim() },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      const ok = !!result?.success;
      setTestResult({
        success: ok,
        messageId: result?.messageId,
        error: result?.error || (ok ? undefined : data?.error),
        sentAt: new Date().toLocaleString(bn ? 'bn-BD' : 'en-US'),
        method: data?.method,
      });
      toast({
        title: ok ? (bn ? 'মেসেজ পাঠানো হয়েছে' : 'Message sent') : (bn ? 'পাঠানো ব্যর্থ' : 'Send failed'),
        description: ok ? (bn ? 'WhatsApp এ চেক করুন' : 'Check WhatsApp inbox') : (result?.error || data?.error),
        variant: ok ? 'default' : 'destructive',
      });
    } catch (err: any) {
      setTestResult({ success: false, error: err.message, sentAt: new Date().toLocaleString(bn ? 'bn-BD' : 'en-US') });
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const previewUrl = buildWhatsAppUrl(form.phone_number, form.welcome_message);

  return (
    <div className="space-y-6">
      {/* 1. Free WhatsApp Gateway Card */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2 text-foreground font-bold">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                {bn ? 'ফ্রি WhatsApp গেটওয়ে (Evolution API / QR Code সেশন)' : 'Free WhatsApp Gateway (Evolution API / Baileys)'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                  ১০০% ফ্রি (০ টাকা খরচ)
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                {bn
                  ? 'কোনো থার্ড-পার্টি বা মেটা এপিআই ফি ছাড়া মাদ্রাসার সাধারণ WhatsApp নম্বর দিয়ে আনলিমিটেড OTP, নোটিশ ও ফি রিমাইন্ডার পাঠান।'
                  : 'Send unlimited free OTP, notices and fee reminders using your madrasa WhatsApp number.'}
              </CardDescription>
            </div>
            <Switch
              checked={freeGateway.is_enabled}
              onCheckedChange={(v) => setFreeGateway({ ...freeGateway, is_enabled: v })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">{bn ? 'প্রোভাইডার ইঞ্জিন' : 'Provider Engine'}</Label>
              <Select
                value={freeGateway.provider}
                onValueChange={(v) => setFreeGateway({ ...freeGateway, provider: v })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolution">Evolution API (পরামর্শিত)</SelectItem>
                  <SelectItem value="baileys">Baileys / Custom Webhook</SelectItem>
                  <SelectItem value="wppconnect">WPPConnect Server</SelectItem>
                  <SelectItem value="android">Android Gateway (TextBee/App)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{bn ? 'গেটওয়ে সার্ভার URL' : 'Gateway Server URL'}</Label>
              <Input
                value={freeGateway.server_url}
                onChange={(e) => setFreeGateway({ ...freeGateway, server_url: e.target.value })}
                placeholder="https://your-evolution-api.up.railway.app"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">{bn ? 'সেশন / ইনস্ট্যান্স নাম' : 'Instance Name'}</Label>
              <Input
                value={freeGateway.instance_name}
                onChange={(e) => setFreeGateway({ ...freeGateway, instance_name: e.target.value })}
                placeholder="madrasa_main"
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-xs">{bn ? 'এপিআই সিক্রেট / গ্লোবাল টোকেন (API Key)' : 'API Key / Global Token'}</Label>
              <Input
                type="password"
                value={freeGateway.api_key}
                onChange={(e) => setFreeGateway({ ...freeGateway, api_key: e.target.value })}
                placeholder="your-secret-api-token"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckConnection}
                disabled={checkingStatus || !freeGateway.server_url.trim()}
                className="h-9 flex-1 gap-1.5"
              >
                {checkingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {bn ? 'স্ট্যাটাস চেক' : 'Check Status'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOpenQrModal}
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <QrCode className="w-3.5 h-3.5" />
                {bn ? 'QR কোড স্ক্যান' : 'Scan QR'}
              </Button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              connectionStatus === 'connected' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' :
              connectionStatus === 'disconnected' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' :
              'bg-destructive/15 text-destructive'
            }`}>
              {statusMessage}
            </div>
          )}

          <div className="p-3 rounded-lg bg-background/80 border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {bn ? 'কীভাবে ২ মিনিটে ফ্রি গেটওয়ে চালু করবেন?' : 'How to deploy free gateway in 2 mins?'}
            </p>
            <p>{bn
              ? 'Render.com বা Railway.app-এ গিয়ে "Evolution API" এর ফ্রি ডকার ইমেজটি এক ক্লিকে ডিপ্লয় করুন। এরপর পাওয়া সার্ভার লিংকটি ও ইনস্ট্যান্স নাম এখানে পেস্ট করে "QR কোড স্ক্যান" বাটনে চাপুন।'
              : 'Deploy Evolution API Docker template on Render.com or Railway.app for free. Paste the URL here and click Scan QR to link your number.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Floating Chat Button */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {bn ? 'ওয়েবসাইট ফ্লোটিং চ্যাট বাটন' : 'Website Floating Chat Button'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <Label>{bn ? 'ফ্লোটিং বাটন চালু' : 'Enable floating button'}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn ? 'ওয়েবসাইটের নিচে ডান/বাম কোনায় WhatsApp আইকন দেখাবে' : 'Shows a WhatsApp icon at the bottom corner'}
              </p>
            </div>
            <Switch
              checked={form.show_floating_button}
              onCheckedChange={(v) => setForm({ ...form, show_floating_button: v })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{bn ? 'মাদ্রাসার WhatsApp নম্বর' : 'Madrasa WhatsApp Number'} *</Label>
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+8801XXXXXXXXX"
                className={phoneError && form.phone_number ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {phoneError && form.phone_number ? (
                <p className="text-xs text-destructive mt-1">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {bn ? 'কান্ট্রি কোডসহ (যেমন: +8801XXXXXXXXX) অথবা লোকাল ১১-ডিজিট (01XXXXXXXXX)' : 'With country code (e.g., +8801XXXXXXXXX) or local 11-digit (01XXXXXXXXX)'}
                </p>
              )}
            </div>
            <div>
              <Label>{bn ? 'বাটনের অবস্থান' : 'Button position'}</Label>
              <Select value={form.button_position} onValueChange={(v: any) => setForm({ ...form, button_position: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">{bn ? 'নিচে-ডান' : 'Bottom Right'}</SelectItem>
                  <SelectItem value="bottom-left">{bn ? 'নিচে-বাম' : 'Bottom Left'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{bn ? 'স্বাগত বার্তা (Pre-filled message)' : 'Welcome message (Pre-filled)'}</Label>
            <Textarea
              value={form.welcome_message}
              onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              rows={3}
              placeholder={bn ? 'আসসালামু আলাইকুম, আমি মাদ্রাসার বিষয়ে জানতে চাই...' : 'Hello, I would like to know...'}
            />
          </div>

          {previewUrl && (
            <div className="p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-between">
              <div className="text-xs">
                <p className="font-medium text-foreground">{bn ? 'প্রিভিউ লিংক:' : 'Preview link:'}</p>
                <p className="text-muted-foreground truncate max-w-[280px]">{previewUrl}</p>
              </div>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />{bn ? 'টেস্ট' : 'Test'}
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Meta Cloud API (Optional Paid) */}
      <Card className="opacity-90">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{bn ? 'Meta WhatsApp Cloud API (বিকল্প অফিশিয়াল পেইড)' : 'Meta WhatsApp Cloud API (Official Paid Option)'}</span>
            <span className="text-xs font-normal text-muted-foreground">{bn ? 'মেটার পেইড একাউন্ট' : 'Paid Meta Account'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
            <div>
              <Label>{bn ? 'Meta Cloud API চালু' : 'Enable Meta Cloud API'}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bn ? 'ফ্রি গেটওয়ের বদলে মেটার অফিশিয়াল এপিআই ব্যবহার করতে চাইলে চালু করুন' : 'Enable to use Meta Official Cloud API'}
              </p>
            </div>
            <Switch
              checked={form.cloud_api_enabled}
              onCheckedChange={(v) => setForm({ ...form, cloud_api_enabled: v })}
            />
          </div>

          {form.cloud_api_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Phone Number ID</Label>
                <Input
                  value={form.phone_number_id}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                  placeholder="123456789012345"
                />
              </div>
              <div>
                <Label>Business Account ID</Label>
                <Input
                  value={form.business_account_id}
                  onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
                  placeholder="987654321098765"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Test WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="w-4 h-4 text-[#25D366]" />
            {bn ? 'টেস্ট WhatsApp মেসেজ পাঠান' : 'Send Test WhatsApp Message'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {bn ? 'প্রাপকের নম্বর' : 'Recipient phone'} *
              </Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+8801XXXXXXXXX"
                disabled={testing}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleTest}
                disabled={testing || (!freeGateway.is_enabled && !form.cloud_api_enabled)}
                className="w-full gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testing ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (bn ? 'টেস্ট পাঠান' : 'Send Test')}
              </Button>
            </div>
          </div>

          <div>
            <Label>{bn ? 'টেস্ট মেসেজ' : 'Test message'}</Label>
            <Textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={2}
              disabled={testing}
            />
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-xl border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1 text-xs">
                  <p className="font-semibold text-sm text-foreground">
                    {testResult.success ? (bn ? 'মেসেজ সফলভাবে পৌঁছেছে!' : 'Successfully delivered!') : (bn ? 'পাঠানো ব্যর্থ' : 'Delivery failed')}
                  </p>
                  {testResult.method && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">{bn ? 'পদ্ধতি:' : 'Method:'}</span> {testResult.method === 'free_gateway' ? 'ফ্রি WhatsApp গেটওয়ে 🟢' : 'Meta Cloud API'}
                    </p>
                  )}
                  {testResult.error && <p className="text-destructive">{testResult.error}</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {bn ? 'সকল সেটিংস সংরক্ষণ করুন' : 'Save All Settings'}
        </Button>
      </div>

      {/* QR Connect Dialog */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              {bn ? 'WhatsApp নম্বর লিঙ্ক করুন' : 'Link WhatsApp Number'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? 'মাদ্রাসার WhatsApp নম্বরটি যুক্ত করতে নিচের QR কোডটি স্ক্যান করুন।'
                : 'Scan the QR code to link your Madrasa WhatsApp account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {loadingQr ? (
              <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs">{bn ? 'QR কোড লোড হচ্ছে...' : 'Loading QR Code...'}</p>
              </div>
            ) : qrCodeData ? (
              <div className="p-4 bg-white rounded-xl shadow-inner border flex flex-col items-center">
                {qrCodeData.startsWith('data:image') || qrCodeData.startsWith('http') ? (
                  <img src={qrCodeData} alt="WhatsApp QR" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="p-4 text-center font-mono text-lg font-bold tracking-widest bg-muted text-foreground rounded-lg">
                    {qrCodeData}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {bn ? 'স্ক্যানের জন্য প্রস্তুত' : 'Ready to scan'}
                </p>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{bn ? 'সার্ভার সংযোগ প্রয়োজন' : 'Server Connection Needed'}</p>
                <p>{bn
                  ? 'আপনার গেটওয়ে সার্ভার URL এবং ইনস্ট্যান্স নাম কনফিগার করে স্ট্যাটাস চেক করুন। সার্ভার রেডি থাকলে এখানে সরাসরি কিউআর কোড দেখা যাবে।'
                  : 'Configure gateway server URL and instance name first.'}
                </p>
              </div>
            )}

            <div className="w-full p-3 rounded-lg bg-muted text-xs space-y-1.5 text-muted-foreground">
              <p className="font-semibold text-foreground">{bn ? 'কীভাবে স্ক্যান করবেন:' : 'How to scan:'}</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>{bn ? 'ফোনে WhatsApp ওপেন করুন।' : 'Open WhatsApp on your phone.'}</li>
                <li>{bn ? 'উপরে ডানপাশের ৩-ডট (বা Settings) চাপুন।' : 'Tap Menu (3 dots) or Settings.'}</li>
                <li>{bn ? '"Linked devices" ➔ "Link a device" চাপুন।' : 'Select "Linked devices" > "Link a device".'}</li>
                <li>{bn ? 'এই QR কোডটি স্ক্যান করলেই সংযোগ সম্পন্ন হবে।' : 'Point camera to this QR code.'}</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>
              {bn ? 'বন্ধ করুন' : 'Close'}
            </Button>
            <Button
              onClick={handleOpenQrModal}
              disabled={loadingQr || !freeGateway.server_url.trim()}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RefreshCw className="w-4 h-4" />
              {bn ? 'রিফ্রেশ QR' : 'Refresh QR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppSettings;
