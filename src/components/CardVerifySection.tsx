import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  ShieldCheck, 
  CreditCard, 
  Scan, 
  ExternalLink, 
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { verifyCard } from '@/hooks/useApiVerification';
import { 
  createDiditSession, 
  getDiditSessionDecision, 
  parseDiditDecision,
  DiditExtractedData,
  DIDIT_DEFAULT_API_KEY
} from '@/lib/diditService';

interface CardVerifySectionProps {
  formType: 'student' | 'staff';
  isEnabled: boolean;
  onDataReceived: (data: Record<string, string>) => void;
}

const CardVerifySection = ({ formType, isEnabled, onDataReceived }: CardVerifySectionProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Manual Card ID state
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  // Didit Verification Session state
  const [diditModalOpen, setDiditModalOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [sessionUrl, setSessionUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [extractedData, setExtractedData] = useState<DiditExtractedData | null>(null);

  // Poll Didit session when modal is open and sessionId is set
  useEffect(() => {
    let intervalId: any = null;

    if (diditModalOpen && sessionId && !extractedData?.fullName && !extractedData?.documentNumber) {
      intervalId = setInterval(async () => {
        try {
          const decision = await getDiditSessionDecision(sessionId, DIDIT_DEFAULT_API_KEY);
          if (decision?.status && decision.status !== 'Not Started') {
            const parsed = parseDiditDecision(decision);
            if (parsed.documentNumber || parsed.fullName || parsed.firstName) {
              setExtractedData(parsed);
              clearInterval(intervalId);
            }
          }
        } catch (e) {
          // Keep polling until user completes or closes
        }
      }, 3500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [diditModalOpen, sessionId, extractedData]);

  // Traditional ID auto-fill handler
  const handleVerify = async () => {
    if (!cardNumber.trim()) {
      toast.error(bn ? 'কার্ড নম্বর দিন' : 'Enter card number');
      return;
    }

    setLoading(true);
    setVerified(false);
    try {
      const result = await verifyCard(cardNumber.trim(), formType);
      if (result?.data && Object.keys(result.data).length > 0) {
        onDataReceived(result.data);
        setVerified(true);
        toast.success(bn ? 'তথ্য সফলভাবে লোড হয়েছে' : 'Data loaded successfully');
      } else {
        toast.warning(bn ? 'কোনো তথ্য পাওয়া যায়নি' : 'No data found');
      }
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'ভেরিফিকেশন ব্যর্থ' : 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  // Launch Didit KYC Session
  const handleStartDiditVerification = async () => {
    // Open a blank window synchronously during the click gesture to avoid browser popup blockers
    const popup = window.open('about:blank', '_blank', 'width=550,height=750');
    setCreatingSession(true);
    setExtractedData(null);
    try {
      const session = await createDiditSession();
      setSessionId(session.session_id);
      setSessionUrl(session.url);
      setDiditModalOpen(true);
      
      if (popup && !popup.closed) {
        popup.location.href = session.url;
      } else {
        window.open(session.url, '_blank', 'width=550,height=750');
      }
      toast.success(bn ? 'Didit ভেরিফিকেশন উইন্ডো চালু হয়েছে' : 'Didit verification window opened');
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      toast.error(err?.message || (bn ? 'Didit সেশন তৈরি করা যায়নি' : 'Failed to launch Didit session'));
    } finally {
      setCreatingSession(false);
    }
  };

  // Manually check status
  const handleManualCheckStatus = async () => {
    if (!sessionId) return;
    setPollingStatus(true);
    try {
      const decision = await getDiditSessionDecision(sessionId);
      const parsed = parseDiditDecision(decision);
      setExtractedData(parsed);

      if (parsed.documentNumber || parsed.fullName || parsed.firstName) {
        toast.success(bn ? 'কার্ডের তথ্য সফলভাবে পাওয়া গেছে!' : 'Card data retrieved successfully!');
      } else {
        toast.info(bn ? `স্ট্যাটাস: ${decision.status || 'চলমান... স্ক্যান শেষ করুন'}` : `Status: ${decision.status || 'In Progress'}`);
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS') || msg.includes('Failed to fetch session decision')) {
        toast.warning(
          bn 
            ? 'Didit উইন্ডোতে "You\'ve been verified" দেখালে এনআইডি সফলভাবে যাচাই হয়েছে। ব্রাউজার সিকিউরিটি (CORS) সীমাবদ্ধতার কারণে অটো-সিঙ্ক না হলে ডায়ালগটি বন্ধ করে ফরমে তথ্য পূরণ করতে পারেন।' 
            : 'Verification succeeded on Didit. If browser security (CORS) blocks auto-sync, you can close this window and proceed with the form.',
          { duration: 8000 }
        );
      } else {
        toast.error(err?.message || (bn ? 'তথ্য সংগ্রহ করা যায়নি' : 'Failed to fetch status'));
      }
    } finally {
      setPollingStatus(false);
    }
  };

  // Apply Didit Extracted Data to the Form
  const handleApplyDiditData = () => {
    if (!extractedData) return;

    const mapped: Record<string, string> = {};
    if (formType === 'student') {
      if (extractedData.firstName) mapped.first_name = extractedData.firstName;
      if (extractedData.lastName) mapped.last_name = extractedData.lastName;
      if (!extractedData.firstName && extractedData.fullName) mapped.first_name = extractedData.fullName;
      if (extractedData.dateOfBirth) mapped.date_of_birth = extractedData.dateOfBirth;
      if (extractedData.gender) mapped.gender = extractedData.gender;
      if (extractedData.address) mapped.address = extractedData.address;
      if (extractedData.documentNumber) mapped.birth_reg_no = extractedData.documentNumber;
    } else {
      // staff form
      if (extractedData.fullName) mapped.name_bn = extractedData.fullName;
      if (extractedData.firstName && extractedData.lastName) {
        mapped.name_en = `${extractedData.firstName} ${extractedData.lastName}`;
      } else if (extractedData.fullName) {
        mapped.name_en = extractedData.fullName;
      }
      if (extractedData.dateOfBirth) mapped.date_of_birth = extractedData.dateOfBirth;
      if (extractedData.documentNumber) mapped.nid = extractedData.documentNumber;
      if (extractedData.address) mapped.address = extractedData.address;
    }

    onDataReceived(mapped);
    setVerified(true);
    setDiditModalOpen(false);
    toast.success(bn ? 'Didit থেকে ফর্মের সব তথ্য অটো-ফিল সম্পন্ন হয়েছে!' : 'Form fields auto-filled from Didit!');
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              {formType === 'student'
                ? (bn ? 'জন্ম নিবন্ধন ও স্মার্ট কার্ড ভেরিফিকেশন' : 'Birth Certificate & ID Verification')
                : (bn ? 'এনআইডি ও কার্ড ভেরিফিকেশন' : 'NID & Card Verification')}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Didit AI Powered
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formType === 'student'
                ? (bn ? 'জন্ম নিবন্ধন সনদ বা স্মার্ট কার্ডের ছবি স্ক্যান করে নির্ভুলভাবে ছাত্রের তথ্য পূরণ করুন' : 'Scan Birth Certificate / ID to auto-fill student details')
                : (bn ? 'এনআইডি কার্ড বা স্মার্ট কার্ড স্ক্যান করে নির্ভুলভাবে তথ্য পূরণ করুন' : 'Scan NID/ID to verify authenticity and auto-fill details')}
            </p>
          </div>
        </div>

        {/* Live Didit Scan Trigger Button */}
        <Button
          type="button"
          onClick={handleStartDiditVerification}
          disabled={creatingSession}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 shrink-0"
        >
          {creatingSession ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Scan className="w-4 h-4" />
          )}
          <span>
            {formType === 'student'
              ? (bn ? 'জন্ম নিবন্ধন / NID স্ক্যান করুন' : 'Scan Birth Certificate / NID')
              : (bn ? 'NID / স্মার্ট কার্ড স্ক্যান করুন' : 'Scan NID / Smart Card')}
          </span>
        </Button>
      </div>

      {/* Manual ID Input option */}
      <div className="pt-3 border-t border-primary/10">
        <Label className="text-xs text-muted-foreground mb-1 block">
          {formType === 'student'
            ? (bn ? 'অথবা জন্ম নিবন্ধন / শিক্ষার্থী আইডি নম্বর দিয়ে খুঁজুন' : 'Or search by 17-digit Birth Reg No / Student ID')
            : (bn ? 'অথবা এনআইডি / স্টাফ আইডি নম্বর দিয়ে খুঁজুন' : 'Or search by existing NID / Staff ID')}
        </Label>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Input
              className="bg-background shadow-xs font-mono"
              value={cardNumber}
              onChange={(e) => {
                // Convert Bengali numbers to English digits and allow digits only
                const converted = e.target.value
                  .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
                  .replace(/\D/g, ''); // english digits only
                setCardNumber(converted);
                setVerified(false);
              }}
              placeholder={formType === 'student'
                ? (bn ? '১৭ ডিজিটের জন্ম নিবন্ধন নম্বর বা আইডি লিখুন...' : 'Enter 17-digit Birth Reg No or Student ID...')
                : (bn ? 'এনআইডি নম্বর বা আইডি লিখুন (ইংরেজি সংখ্যা)...' : 'Enter NID or ID number (digits only)...')}
              disabled={loading}
              inputMode="numeric"
            />
          </div>
          <Button
            type="button"
            onClick={handleVerify}
            disabled={loading || !cardNumber.trim()}
            className={verified ? 'bg-green-600 hover:bg-green-700 text-white' : 'btn-primary-gradient'}
            size="default"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />{bn ? 'যাচাই হচ্ছে...' : 'Verifying...'}</>
            ) : verified ? (
              <><ShieldCheck className="w-4 h-4 mr-2" />{bn ? 'ভেরিফাইড' : 'Verified'}</>
            ) : (
              <><ShieldCheck className="w-4 h-4 mr-2" />{bn ? 'সার্চ করুন' : 'Search'}</>
            )}
          </Button>
        </div>
      </div>

      {verified && (
        <p className="text-xs text-green-600 mt-2.5 flex items-center gap-1 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {bn ? 'ফর্মের তথ্যগুলো অটো-ফিল হয়েছে। প্রয়োজনে যেকোনো তথ্য এডিট করতে পারেন।' : 'Form fields auto-filled. You can modify if needed.'}
        </p>
      )}

      {/* Didit Scan Dialog */}
      <Dialog open={diditModalOpen} onOpenChange={setDiditModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Scan className="w-5 h-5 text-emerald-600" />
              {bn ? 'Didit আইডি ভেরিফিকেশন' : 'Didit ID Verification'}
            </DialogTitle>
            <DialogDescription>
              {bn 
                ? 'আইডি কার্ড স্ক্যান বা ছবি আপলোড করুন। স্ক্যান শেষ হলে তথ্য স্বয়ংক্রিয়ভাবে ফর্মে যুক্ত হবে।' 
                : 'Upload or capture the ID card. The details will be loaded automatically.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* Step 1: Verification Window */}
            <div className="p-4 rounded-xl border border-muted bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {bn ? 'ভেরিফিকেশন লিঙ্ক' : 'Verification Session'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {bn ? 'লাইভ সেশন' : 'Live Session'}
                </span>
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 text-xs space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>💻</span>
                  {bn ? 'কম্পিউটার থেকে ব্যবহারের নিয়ম:' : 'How to use on a computer:'}
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                  <li>
                    {bn 
                      ? 'কম্পিউটারে ওয়েবক্যাম থাকলে: স্ক্যান পেজে সরাসরি ওয়েবক্যাম দিয়ে ছবি তুলুন।' 
                      : 'If PC has a webcam: Capture photo directly using your webcam.'}
                  </li>
                  <li>
                    {bn 
                      ? 'কম্পিউটারে ওয়েবক্যাম না থাকলে: স্ক্যান উইন্ডোতে একটি QR Code আসবে, যা আপনার মোবাইল ক্যামেরা দিয়ে স্ক্যান করলেই ফোনের ব্যাক ক্যামেরা দিয়ে কার্ডের ছবি তোলা যাবে এবং সাথে সাথে তথ্য কম্পিউটারে চলে আসবে!' 
                      : 'No webcam on PC? A QR code will appear—scan it with your phone camera to take the photo and sync data back to this PC instantly!'}
                  </li>
                </ul>
              </div>

              {sessionUrl && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(sessionUrl, '_blank', 'width=550,height=750')}
                    className="flex-1 flex items-center justify-center gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {bn ? 'পপআপ খুলুন' : 'Open Popup'}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => window.open(sessionUrl, '_blank')}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {bn ? 'নতুন ট্যাবে খুলুন' : 'Open in New Tab'}
                  </Button>
                </div>
              )}
            </div>

            {/* Step 2: Extracted Data Preview */}
            {extractedData?.fullName || extractedData?.documentNumber ? (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  <FileCheck className="w-4 h-4" />
                  {bn ? 'কার্ড থেকে তথ্য সংগ্রহ সফল!' : 'Card Data Extracted Successfully!'}
                </div>

                <div className="text-xs space-y-1.5 text-foreground/90 bg-background/80 p-3 rounded-lg border">
                  {extractedData.fullName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'নাম:' : 'Name:'}</span>
                      <span className="font-semibold">{extractedData.fullName}</span>
                    </div>
                  )}
                  {extractedData.documentNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'আইডি নম্বর:' : 'ID Number:'}</span>
                      <span className="font-mono font-semibold">{extractedData.documentNumber}</span>
                    </div>
                  )}
                  {extractedData.dateOfBirth && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'জন্ম তারিখ:' : 'DOB:'}</span>
                      <span>{extractedData.dateOfBirth}</span>
                    </div>
                  )}
                  {extractedData.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{bn ? 'ঠিকানা:' : 'Address:'}</span>
                      <span className="text-right truncate max-w-[200px]">{extractedData.address}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleApplyDiditData}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm mt-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {bn ? 'ফর্মে তথ্যগুলো বসিয়ে দিন' : 'Apply to Form'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-5 border border-dashed rounded-xl text-center space-y-3 bg-muted/10">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    {bn ? 'স্ক্যান সম্পন্ন হওয়ার অপেক্ষা...' : 'Waiting for scan completion...'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    {bn 
                      ? 'Didit উইন্ডোতে আইডি কার্ডের ছবি আপলোড বা ক্যামেরা দিয়ে স্ক্যান সম্পন্ন করুন।' 
                      : 'Complete the ID photo capture on the Didit page.'}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 text-left space-y-1 w-full">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {bn ? 'Didit উইন্ডোতে "You\'ve been verified!" দেখাচ্ছে?' : 'Didit shows "You\'ve been verified!"?'}
                  </p>
                  <p className="leading-relaxed opacity-90 text-[11px]">
                    {bn
                      ? 'অভিনন্দন! আপনার কার্ড সফলভাবে স্ক্যান ও যাচাই হয়েছে। ব্রাউজারের সিকিউরিটি পলিসির (CORS) কারণে সরাসরি অটো-সিঙ্ক না হলে "ফরমে ফিরে যান" চেপে প্রয়োজনীয় তথ্য ফরমে টাইপ করতে পারেন।'
                      : 'Verification was successful on Didit! If browser security prevents automatic sync, click below to return and enter details.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualCheckStatus}
                    disabled={pollingStatus}
                    className="flex-1 text-xs"
                  >
                    {pollingStatus ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {bn ? 'স্ট্যাটাস রিফ্রেশ করুন' : 'Refresh Status Now'}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setDiditModalOpen(false)}
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {bn ? 'ফরমে ফিরে যান' : 'Continue to Form'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardVerifySection;
