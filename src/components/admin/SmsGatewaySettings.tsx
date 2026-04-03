import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, Eye, EyeOff, MessageSquare, CheckCircle2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PROVIDERS = [
  { id: 'bulksmsbd', name: 'BulkSMSBD', fields: ['api_url', 'api_key', 'sender_id'] },
  { id: 'smsnoc', name: 'SMSNoc', fields: ['api_url', 'api_key', 'sender_id'] },
  { id: 'grameenphone', name: 'Grameenphone SMS', fields: ['api_url', 'api_key', 'api_secret', 'sender_id'] },
  { id: 'twilio', name: 'Twilio', fields: ['api_key', 'api_secret', 'sender_id'] },
  { id: 'generic', name: 'Generic / Other', fields: ['api_url', 'api_key', 'api_secret', 'sender_id'] },
];

const FIELD_LABELS: Record<string, { en: string; bn: string; placeholder: string }> = {
  api_url: { en: 'API URL', bn: 'API URL', placeholder: 'https://api.sms-provider.com/v1/send' },
  api_key: { en: 'API Key / Account SID', bn: 'API Key / Account SID', placeholder: 'your-api-key' },
  api_secret: { en: 'API Secret / Auth Token', bn: 'API Secret / Auth Token', placeholder: 'your-secret' },
  sender_id: { en: 'Sender ID / Phone Number', bn: 'সেন্ডার আইডি / ফোন নম্বর', placeholder: 'MYSENDER or +8801...' },
};

const SmsGatewaySettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [selectedProvider, setSelectedProvider] = useState('bulksmsbd');
  const [config, setConfig] = useState({
    provider: 'bulksmsbd',
    provider_name: '',
    api_url: '',
    api_key: '',
    api_secret: '',
    sender_id: '',
    is_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [testDialog, setTestDialog] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('sms_gateway_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) {
      setConfig({
        provider: data.provider,
        provider_name: data.provider_name,
        api_url: data.api_url,
        api_key: data.api_key,
        api_secret: data.api_secret,
        sender_id: data.sender_id,
        is_enabled: data.is_enabled,
      });
      setSelectedProvider(data.provider);
      setExistingId(data.id);
    }
    setLoading(false);
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const p = PROVIDERS.find(p => p.id === providerId);
    setConfig(prev => ({ ...prev, provider: providerId, provider_name: p?.name || providerId }));
  };

  const saveConfig = async () => {
    setSaving(true);
    const payload = { ...config, updated_at: new Date().toISOString() };
    let error;
    if (existingId) {
      ({ error } = await supabase.from('sms_gateway_config').update(payload).eq('id', existingId));
    } else {
      const { data, error: e } = await supabase.from('sms_gateway_config').insert(payload).select('id').single();
      error = e;
      if (data) setExistingId(data.id);
    }
    setSaving(false);
    if (error) {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Failed to save');
    } else {
      toast.success(bn ? 'SMS গেটওয়ে সেটিংস সংরক্ষিত' : 'SMS gateway settings saved');
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast.error(bn ? 'ফোন নম্বর দিন' : 'Enter phone number');
      return;
    }
    setTesting(true);
    // Placeholder for test - just show success since actual sending needs backend
    setTimeout(() => {
      toast.info(bn ? 'SMS টেস্ট ফিচার শীঘ্রই আসছে' : 'SMS test feature coming soon');
      setTesting(false);
      setTestDialog(false);
    }, 1000);
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[4];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Provider Selection */}
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {bn ? 'SMS গেটওয়ে প্রোভাইডার' : 'SMS Gateway Provider'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProviderChange(p.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                selectedProvider === p.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">{p.name}</span>
                {selectedProvider === p.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuration */}
      <div className="card-elevated p-5">
        <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {bn ? `${currentProvider.name} কনফিগারেশন` : `${currentProvider.name} Configuration`}
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm font-medium text-foreground">{bn ? 'SMS গেটওয়ে সক্রিয়' : 'SMS Gateway Enabled'}</p>
              <p className="text-xs text-muted-foreground">{bn ? 'SMS পাঠানো চালু/বন্ধ' : 'Enable/disable SMS sending'}</p>
            </div>
            <Switch checked={config.is_enabled} onCheckedChange={(v) => setConfig({ ...config, is_enabled: v })} />
          </div>

          {selectedProvider === 'generic' && (
            <div>
              <Label>{bn ? 'প্রোভাইডারের নাম' : 'Provider Name'}</Label>
              <Input
                className="mt-1 bg-background"
                value={config.provider_name}
                onChange={(e) => setConfig({ ...config, provider_name: e.target.value })}
                placeholder={bn ? 'আপনার প্রোভাইডারের নাম' : 'Your provider name'}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentProvider.fields.map(field => {
              const label = FIELD_LABELS[field];
              const isSecret = field === 'api_secret';
              return (
                <div key={field} className={field === 'api_url' ? 'sm:col-span-2' : ''}>
                  <Label>{bn ? label.bn : label.en} {['api_key'].includes(field) && <span className="text-destructive">*</span>}</Label>
                  <div className="relative mt-1">
                    <Input
                      className="bg-background pr-10"
                      type={isSecret && !showSecret ? 'password' : 'text'}
                      value={(config as any)[field]}
                      onChange={(e) => setConfig({ ...config, [field]: e.target.value })}
                      placeholder={label.placeholder}
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={saving} className="btn-primary-gradient flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {bn ? 'SMS সেটিংস সংরক্ষণ' : 'Save SMS Settings'}
            </Button>
            <Button onClick={() => setTestDialog(true)} variant="outline">
              <Send className="w-4 h-4 mr-2" />
              {bn ? 'টেস্ট SMS' : 'Test SMS'}
            </Button>
          </div>

          {selectedProvider === 'twilio' && (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{bn ? 'Twilio সেটআপ:' : 'Twilio Setup:'}</p>
              <p>• API Key = Account SID</p>
              <p>• API Secret = Auth Token</p>
              <p>• Sender ID = Twilio Phone Number (e.g., +1234567890)</p>
              <p>• {bn ? 'twilio.com/console থেকে তথ্য নিন' : 'Get details from twilio.com/console'}</p>
            </div>
          )}

          {['bulksmsbd', 'smsnoc'].includes(selectedProvider) && (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{bn ? 'বাংলাদেশি SMS প্রোভাইডার:' : 'Bangladeshi SMS Provider:'}</p>
              <p>• {bn ? 'আপনার প্রোভাইডারের ড্যাশবোর্ড থেকে API Key এবং Sender ID সংগ্রহ করুন' : 'Get API Key and Sender ID from your provider dashboard'}</p>
              <p>• {bn ? 'API URL প্রোভাইডারের ডকুমেন্টেশন থেকে নিন' : 'Get API URL from provider documentation'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Test SMS Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {bn ? 'টেস্ট SMS পাঠান' : 'Send Test SMS'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {bn ? 'একটি টেস্ট SMS পাঠানো হবে। সফলভাবে আসলে সেটআপ সঠিক।' : 'A test SMS will be sent. If received, setup is correct.'}
            </p>
            <div>
              <Label>{bn ? 'ফোন নম্বর' : 'Phone Number'}</Label>
              <Input
                className="mt-1"
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+8801XXXXXXXXX"
              />
            </div>
            <Button onClick={handleTestSms} disabled={testing} className="w-full btn-primary-gradient">
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {bn ? 'টেস্ট SMS পাঠান' : 'Send Test SMS'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmsGatewaySettings;
