import { useState, useRef, useEffect } from 'react';
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
  Upload, 
  Camera,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  X,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { verifyCard } from '@/hooks/useApiVerification';
import { scanImageWithOcr, OcrCardResult, normalizeGender } from '@/lib/ocrCardParser';
import { hasBangla, hasEnglish, cleanStaffName } from '@/lib/nameFormatter';

interface CardVerifySectionProps {
  formType: 'student' | 'staff';
  isEnabled: boolean;
  onDataReceived: (data: Record<string, any>) => void;
}

const CardVerifySection = ({ formType, isEnabled, onDataReceived }: CardVerifySectionProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Manual Card ID search state
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  // In-app OCR Modal State
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Editable extracted data
  const [extractedData, setExtractedData] = useState<{
    documentNumber: string;
    fullName: string;
    fullNameBn: string;
    fullNameEn: string;
    dateOfBirth: string;
    fatherName: string;
    motherName: string;
    gender: 'male' | 'female';
    bloodGroup: string;
    address: string;
    rawText: string;
  }>({
    documentNumber: '',
    fullName: '',
    fullNameBn: '',
    fullNameEn: '',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    gender: 'male',
    bloodGroup: '',
    address: '',
    rawText: '',
  });

  // Webcam state
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup webcam stream when modal closes
  useEffect(() => {
    if (!ocrModalOpen && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setWebcamActive(false);
    }
  }, [ocrModalOpen]);

  // Traditional ID auto-fill handler (searches database)
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
        toast.warning(bn ? 'ডাটাবেসে কোনো রেকর্ড পাওয়া যায়নি' : 'No record found in database');
      }
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'ভেরিফিকেশন ব্যর্থ' : 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  // Run OCR on an image file or data URL
  const processImageForOcr = async (imageSource: File | Blob | string) => {
    setScanning(true);
    setProgressPct(10);
    setProgressText(bn ? 'ছবি প্রস্তুত হচ্ছে...' : 'Preparing image...');

    try {
      const parsed: OcrCardResult = await scanImageWithOcr(imageSource, (pct, status) => {
        setProgressPct(pct);
        setProgressText(status);
      });

      setExtractedData({
        documentNumber: parsed.documentNumber || '',
        fullName: parsed.fullName || '',
        fullNameBn: parsed.fullNameBn || '',
        fullNameEn: parsed.fullNameEn || '',
        dateOfBirth: parsed.dateOfBirth || '',
        fatherName: parsed.fatherName || '',
        motherName: parsed.motherName || '',
        gender: normalizeGender(parsed.gender),
        bloodGroup: parsed.bloodGroup || '',
        address: parsed.address || '',
        rawText: parsed.rawText || '',
      });

      if (parsed.documentNumber || parsed.fullName || parsed.dateOfBirth) {
        toast.success(bn ? 'কার্ড থেকে তথ্য সফলভাবে শনাক্ত হয়েছে!' : 'Card data extracted successfully!');
      } else {
        toast.info(bn ? 'ছবি থেকে স্পষ্ট লেখা পাওয়া যায়নি। আপনি নিচের ঘরে তথ্য লিখে নিতে পারেন।' : 'No clear text detected. You can fill in the fields below.');
      }
    } catch (err: any) {
      console.error('OCR processing error:', err);
      toast.error(bn ? 'ছবি বিশ্লেষণ করা যায়নি। অনুগ্রহ করে স্পষ্ট ছবি দিন।' : 'Failed to parse image. Please use a clearer photo.');
    } finally {
      setScanning(false);
    }
  };

  // File input change handler (PC file picker)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setOcrModalOpen(true);
      setWebcamActive(false);
      processImageForOcr(file);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  // Start PC Webcam
  const handleStartWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error(bn ? 'আপনার ব্রাউজারে ওয়েবক্যাম সমর্থিত নয়' : 'Webcam not supported in this browser');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      mediaStreamRef.current = stream;
      setWebcamActive(true);
      setOcrModalOpen(true);
      setImagePreview(null);

      // Attach stream to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error('Webcam access error:', err);
      toast.error(bn ? 'ওয়েবক্যাম চালু করা যায়নি। ক্যামেরার পারমিশন দিন অথবা সরাসরি ছবি আপলোড করুন।' : 'Unable to access webcam. Please check camera permissions or upload photo.');
    }
  };

  // Capture photo from live webcam
  const handleCaptureWebcam = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Stop webcam
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setWebcamActive(false);
    setImagePreview(dataUrl);

    // Process captured image
    processImageForOcr(dataUrl);
  };

  // Apply OCR data to the main form
  const handleApplyExtractedData = () => {
    const mapped: Record<string, any> = {
      documentNumber: extractedData.documentNumber,
      date_of_birth: extractedData.dateOfBirth,
      father_name: extractedData.fatherName,
      mother_name: extractedData.motherName,
      gender: normalizeGender(extractedData.gender),
      blood_group: extractedData.bloodGroup,
      address: extractedData.address,
    };

    const bnName = extractedData.fullNameBn || (hasBangla(extractedData.fullName) ? extractedData.fullName : '');
    const enName = extractedData.fullNameEn || (hasEnglish(extractedData.fullName) ? extractedData.fullName : '');

    mapped.name_bn = bnName || extractedData.fullName;
    mapped.name_en = enName;
    mapped.first_name = bnName || extractedData.fullName;
    mapped.last_name = enName;

    if (formType === 'student') {
      mapped.birth_reg_no = extractedData.documentNumber;
      mapped.nid = extractedData.documentNumber;
    } else {
      mapped.nid = extractedData.documentNumber;
    }

    if (extractedData.address) {
      mapped.permanentAddr = {
        village: extractedData.address,
      };
      mapped.presentAddr = {
        village: extractedData.address,
      };
    }

    onDataReceived(mapped);
    setVerified(true);
    setOcrModalOpen(false);
    toast.success(bn ? 'ফর্মের তথ্য সফলভাবে অটো-ফিল সম্পন্ন হয়েছে!' : 'Form fields successfully auto-filled!');
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-primary/5 to-emerald-500/10 border-2 border-emerald-500/30 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
      {/* Hidden file input for PC document selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold shadow-inner">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
              {formType === 'student'
                ? (bn ? 'জন্ম নিবন্ধন ও স্মার্ট কার্ড স্ক্যানার' : 'Birth Certificate & ID Scanner')
                : (bn ? 'এনআইডি ও স্মার্ট কার্ড স্ক্যানার' : 'NID & Smart Card Scanner')}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3" />
                {bn ? 'ইন-অ্যাপ OCR' : 'In-App OCR'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formType === 'student'
                ? (bn ? 'কম্পিউটার থেকে ছবি আপলোড করে মুহূর্তেই শিক্ষার্থীর নাম, ১৭ ডিজিট নম্বর ও জন্ম তারিখ পূরণ করুন' : 'Upload photo from computer to auto-extract student details')
                : (bn ? 'কম্পিউটার থেকে এনআইডি কার্ডের ছবি আপলোড করে স্বয়ংক্রিয়ভাবে তথ্য পূরণ করুন' : 'Upload NID photo from PC to auto-fill details')}
            </p>
          </div>
        </div>

        {/* Action Buttons for Computer / Desktop Users */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 font-medium"
          >
            <Upload className="w-4 h-4" />
            <span>
              {formType === 'student'
                ? (bn ? 'ছবি আপলোড ও স্ক্যান' : 'Upload & Scan')
                : (bn ? 'NID ছবি আপলোড ও স্ক্যান' : 'Upload NID & Scan')}
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleStartWebcam}
            className="border-emerald-600/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"
            title={bn ? 'কম্পিউটারের ওয়েবক্যাম দিয়ে ছবি তুলুন' : 'Use PC Webcam'}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden md:inline">{bn ? 'ওয়েবক্যাম' : 'Webcam'}</span>
          </Button>
        </div>
      </div>

      {/* Manual ID Input Option */}
      <div className="pt-3 border-t border-emerald-500/20">
        <Label className="text-xs text-muted-foreground mb-1 block">
          {formType === 'student'
            ? (bn ? 'অথবা সরাসরি ১৭ ডিজিটের জন্ম নিবন্ধন বা আইডি নম্বর দিয়ে ডাটাবেসে খুঁজুন:' : 'Or search directly by 17-digit Birth Reg No or Student ID:')
            : (bn ? 'অথবা সরাসরি এনআইডি / স্টাফ আইডি নম্বর দিয়ে ডাটাবেসে খুঁজুন:' : 'Or search directly by NID or Staff ID:')}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2.5 items-end">
          <div className="flex-1 w-full">
            <Input
              className="bg-background shadow-xs font-mono tracking-wider"
              value={cardNumber}
              onChange={(e) => {
                const converted = e.target.value
                  .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
                  .trim();
                setCardNumber(converted);
                setVerified(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleVerify();
                }
              }}
              placeholder={formType === 'student'
                ? (bn ? 'বারকোড স্ক্যানার দিয়ে স্ক্যান করুন অথবা ১৭ ডিজিট নম্বর / আইডি দিন...' : 'Scan barcode or enter 17-digit Birth Reg / Student ID...')
                : (bn ? 'বারকোড স্ক্যানার দিয়ে স্ক্যান করুন অথবা এনআইডি / স্টাফ আইডি দিন...' : 'Scan barcode or enter NID / Staff ID...')}
              disabled={loading}
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
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />{bn ? 'খোঁজা হচ্ছে...' : 'Searching...'}</>
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

      {/* In-App Document Scan & OCR Modal */}
      <Dialog open={ocrModalOpen} onOpenChange={setOcrModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Scan className="w-5 h-5 text-emerald-600" />
              {formType === 'student'
                ? (bn ? 'জন্ম নিবন্ধন সনদ স্ক্যান ও অটো-ফিল' : 'Birth Certificate Scan & Auto-fill')
                : (bn ? 'এনআইডি কার্ড স্ক্যান ও অটো-ফিল' : 'NID Card Scan & Auto-fill')}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? 'ছবি থেকে স্বয়ংক্রিয়ভাবে তথ্য সংগ্রহ করা হয়েছে। তথ্যগুলো যাচাই করে "ফর্মে যুক্ত করুন" চাপুন।'
                : 'Data extracted from document. Review details and click "Apply to Form".'}
            </DialogDescription>
          </DialogHeader>

          {/* Live Webcam Stream (if active) */}
          {webcamActive && (
            <div className="space-y-3 my-2">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-4 flex justify-center">
                  <Button
                    type="button"
                    onClick={handleCaptureWebcam}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg px-6"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {bn ? 'ছবি তুলুন (Capture)' : 'Capture Photo'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview & OCR Scanning Progress */}
          {imagePreview && (
            <div className="space-y-4 my-2">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-full sm:w-1/3 rounded-lg overflow-hidden border bg-muted/40 aspect-[4/3] flex items-center justify-center relative">
                  <img src={imagePreview} alt="Document Preview" className="w-full h-full object-contain" />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 text-[10px] h-6 px-2 opacity-90 shadow-xs"
                  >
                    {bn ? 'ছবি পরিবর্তন' : 'Change'}
                  </Button>
                </div>

                <div className="w-full sm:w-2/3 space-y-2">
                  {scanning ? (
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {progressText || (bn ? 'ছবি স্ক্যান হচ্ছে...' : 'Scanning document...')}
                      </p>
                      <div className="w-full bg-emerald-200 dark:bg-emerald-950 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? 'কম্পিউটারেই প্রসেস হচ্ছে, কোনো থার্ড-পার্টি বা মোবাইল প্রয়োজন নেই' : 'Processing locally on your PC'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {bn ? 'তথ্য বিশ্লেষণ সম্পন্ন হয়েছে' : 'OCR Parsing Completed'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => imagePreview && processImageForOcr(imagePreview)}
                        className="h-6 text-[11px] text-emerald-700 hover:text-emerald-900"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {bn ? 'পুনরায় স্ক্যান' : 'Re-scan'}
                      </Button>
                    </div>
                  )}

                  {/* Editable Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">
                        {formType === 'student' ? (bn ? '১৭ ডিজিট জন্ম নিবন্ধন নং' : 'Birth Reg No (17 digits)') : (bn ? 'এনআইডি নং' : 'NID No')}
                      </Label>
                      <Input
                        value={extractedData.documentNumber}
                        onChange={e => setExtractedData(p => ({ ...p, documentNumber: e.target.value }))}
                        className="h-8 font-mono font-medium text-xs mt-0.5"
                        placeholder={formType === 'student' ? '17 digits' : 'NID'}
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'নাম (বাংলায়)' : 'Full Name (Bangla)'}</Label>
                      <Input
                        value={extractedData.fullNameBn || extractedData.fullName}
                        onChange={e => setExtractedData(p => ({ ...p, fullNameBn: e.target.value, fullName: e.target.value }))}
                        className="h-8 text-xs mt-0.5 font-medium"
                        placeholder={bn ? 'বাংলায় নাম' : 'Bangla Name'}
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'নাম (ইংরেজিতে)' : 'Full Name (English)'}</Label>
                      <Input
                        value={extractedData.fullNameEn}
                        onChange={e => setExtractedData(p => ({ ...p, fullNameEn: e.target.value }))}
                        className="h-8 text-xs mt-0.5 font-medium font-mono"
                        placeholder={bn ? 'ইংরেজিতে নাম' : 'English Name'}
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'জন্ম তারিখ (YYYY-MM-DD)' : 'Date of Birth'}</Label>
                      <Input
                        value={extractedData.dateOfBirth}
                        onChange={e => setExtractedData(p => ({ ...p, dateOfBirth: e.target.value }))}
                        className="h-8 text-xs mt-0.5 font-mono"
                        placeholder="YYYY-MM-DD"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'পিতার নাম' : "Father's Name"}</Label>
                      <Input
                        value={extractedData.fatherName}
                        onChange={e => setExtractedData(p => ({ ...p, fatherName: e.target.value }))}
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'মাতার নাম' : "Mother's Name"}</Label>
                      <Input
                        value={extractedData.motherName}
                        onChange={e => setExtractedData(p => ({ ...p, motherName: e.target.value }))}
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'জেন্ডার / লিঙ্গ' : 'Gender'}</Label>
                      <div className="flex gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setExtractedData(p => ({ ...p, gender: 'male' }))}
                          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all ${
                            extractedData.gender === 'male'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {bn ? 'পুরুষ (Male)' : 'Male'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExtractedData(p => ({ ...p, gender: 'female' }))}
                          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all ${
                            extractedData.gender === 'female'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {bn ? 'মহিলা (Female)' : 'Female'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'রক্তের গ্রুপ' : 'Blood Group'}</Label>
                      <Input
                        value={extractedData.bloodGroup}
                        onChange={e => setExtractedData(p => ({ ...p, bloodGroup: e.target.value }))}
                        className="h-8 text-xs mt-0.5 uppercase"
                        placeholder="A+ / B+ / O+ / AB+"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="text-[11px] text-muted-foreground">{bn ? 'ঠিকানা (গ্রাম / রাস্তা / উপজেলা / জেলা)' : 'Address'}</Label>
                      <Input
                        value={extractedData.address}
                        onChange={e => setExtractedData(p => ({ ...p, address: e.target.value }))}
                        className="h-8 text-xs mt-0.5"
                        placeholder={bn ? 'গ্রাম, ডাকঘর, উপজেলা, জেলা...' : 'Village, Post, Upazila, District...'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex flex-col sm:flex-row gap-2.5 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOcrModalOpen(false)}
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>

                <Button
                  type="button"
                  onClick={handleApplyExtractedData}
                  disabled={scanning}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{bn ? 'ফর্মে তথ্য যুক্ত করুন' : 'Apply to Form'}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardVerifySection;
