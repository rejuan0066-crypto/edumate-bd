import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Loader2, Eye, EyeOff, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';

const PROVIDERS = [
  { id: 'bkash', name: 'bKash', fields: ['api_url', 'api_key', 'api_secret', 'merchant_id', 'callback_url'] },
  { id: 'nagad', name: 'Nagad', fields: ['api_url', 'api_key', 'api_secret', 'merchant_id', 'callback_url'] },
  { id: 'sslcommerz', name: 'SSLCommerz', fields: ['api_url', 'api_key', 'api_secret', 'merchant_id', 'callback_url'] },
  { id: 'stripe', name: 'Stripe', fields: ['api_key', 'api_secret', 'callback_url'] },
  { id: 'paypal', name: 'PayPal', fields: ['api_url', 'api_key', 'api_secret', 'callback_url'] },
  { id: 'generic', name: 'Generic / Other', fields: ['api_url', 'api_key', 'api_secret', 'merchant_id', 'callback_url'] },
];

const FIELD_LABELS: Record<string, { en: string; bn: string; placeholder: string }> = {
  api_url: { en: 'API URL', bn: 'API URL', placeholder: 'https://api.example.com/v1' },
  api_key: { en: 'API Key / Store ID', bn: 'API Key / Store ID', placeholder: 'your-api-key' },
  api_secret: { en: 'API Secret / Store Password', bn: 'API Secret / Store Password', placeholder: 'your-secret-key' },
  merchant_id: { en: 'Merchant ID', bn: 'মার্চেন্ট আইডি', placeholder: 'merchant-id' },
  callback_url: { en: 'Callback / IPN URL', bn: 'কলব্যাক / IPN URL', placeholder: 'https://yourdomain.com/api/payment/callback' },
};

const PaymentGatewaySettings = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [selectedProvider, setSelectedProvider] = useState('bkash');
  const [config, setConfig] = useState({
    provider: 'bkash',
    provider_name: '',
    api_url: '',
    api_key: '',
    api_secret: '',
    merchant_id: '',
    callback_url: '',
    is_enabled: false,
    is_sandbox: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('payment_gateway_config')
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
        merchant_id: data.merchant_id,
        callback_url: data.callback_url,
        is_enabled: data.is_enabled,
        is_sandbox: data.is_sandbox,
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
      ({ error } = await supabase.from('payment_gateway_config').update(payload).eq('id', existingId));
    } else {
      const { data, error: e } = await supabase.from('payment_gateway_config').insert(payload).select('id').single();
      error = e;
      if (data) setExistingId(data.id);
    }
    setSaving(false);
    if (error) {
      toast.error(bn ? 'সংরক্ষণ ব্যর্থ' : 'Failed to save');
    } else {
      toast.success(bn ? 'পেমেন্ট গেটওয়ে সেটিংস সংরক্ষিত' : 'Payment gateway settings saved');
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[5];

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
          <CreditCard className="w-5 h-5 text-primary" />
          {bn ? 'পেমেন্ট গেটওয়ে প্রোভাইডার' : 'Payment Gateway Provider'}
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
          <CreditCard className="w-5 h-5 text-primary" />
          {bn ? `${currentProvider.name} কনফিগারেশন` : `${currentProvider.name} Configuration`}
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm font-medium text-foreground">{bn ? 'পেমেন্ট গেটওয়ে সক্রিয়' : 'Payment Gateway Enabled'}</p>
              <p className="text-xs text-muted-foreground">{bn ? 'অনলাইন পেমেন্ট গ্রহণ চালু/বন্ধ' : 'Enable/disable online payments'}</p>
            </div>
            <Switch checked={config.is_enabled} onCheckedChange={(v) => setConfig({ ...config, is_enabled: v })} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <div>
              <p className="text-sm font-medium text-foreground">{bn ? 'স্যান্ডবক্স/টেস্ট মোড' : 'Sandbox / Test Mode'}</p>
              <p className="text-xs text-muted-foreground">{bn ? 'টেস্ট করতে চালু রাখুন, লাইভে বন্ধ করুন' : 'Keep on for testing, turn off for live'}</p>
            </div>
            <Switch checked={config.is_sandbox} onCheckedChange={(v) => setConfig({ ...config, is_sandbox: v })} />
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
                <div key={field} className={field === 'callback_url' ? 'sm:col-span-2' : ''}>
                  <Label>{bn ? label.bn : label.en} {['api_key', 'api_secret'].includes(field) && <span className="text-destructive">*</span>}</Label>
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

          <Button onClick={saveConfig} disabled={saving} className="btn-primary-gradient w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {bn ? 'পেমেন্ট সেটিংস সংরক্ষণ' : 'Save Payment Settings'}
          </Button>

          {config.is_sandbox && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
              <span className="text-yellow-700 dark:text-yellow-400">
                {bn ? 'স্যান্ডবক্স মোড চালু আছে। লাইভ পেমেন্টের জন্য বন্ধ করুন।' : 'Sandbox mode is on. Turn off for live payments.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGatewaySettings;
