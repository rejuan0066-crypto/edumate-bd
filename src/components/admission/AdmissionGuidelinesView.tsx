import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  BookOpen, GraduationCap, FileText, DollarSign, Download, ExternalLink,
  Phone, Mail, CheckCircle2, FileCheck, FileCode, Paperclip,
  Sparkles, ArrowRight, ShieldCheck, Printer, HelpCircle, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  type AdmissionGuidelinesData,
  type AdmissionGuidelineSection,
  type AdmissionGuidelineAttachment
} from '@/hooks/useAdmissionGuidelines';

interface AdmissionGuidelinesViewProps {
  guidelines: AdmissionGuidelinesData;
  onSwitchToApply: () => void;
}

const SECTION_ICONS: Record<string, any> = {
  BookOpen,
  GraduationCap,
  FileText,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
};

export const AdmissionGuidelinesView: React.FC<AdmissionGuidelinesViewProps> = ({
  guidelines,
  onSwitchToApply,
}) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';

  const activeSections = (guidelines.sections || []).filter(s => s.is_active !== false);
  const attachments = guidelines.attachments || [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Hero Card */}
      <div className="border border-slate-200/90 dark:border-border rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-card">
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
            <BookOpen className="w-80 h-80" />
          </div>
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3 py-1 font-semibold backdrop-blur-sm">
                📋 {bn ? 'ভর্তি নির্দেশিকা ও নিয়মাবলী' : 'Admission Guidelines'}
              </Badge>
              {guidelines.session_badge && (
                <Badge className="bg-amber-400 text-amber-950 font-bold text-xs px-3 py-1 border-none shadow-sm">
                  {guidelines.session_badge}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {bn ? guidelines.page_title_bn : (guidelines.page_title_en || guidelines.page_title_bn)}
            </h1>
            <p className="text-sm sm:text-base text-emerald-50 max-w-2xl leading-relaxed">
              {bn ? guidelines.subtitle_bn : (guidelines.subtitle_en || guidelines.subtitle_bn)}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={onSwitchToApply}
                className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all gap-2 text-xs sm:text-sm"
              >
                <GraduationCap className="w-4 h-4" />
                <span>{bn ? 'অনলাইন ভর্তি ফরম পূরণ করুন' : 'Apply Online Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrint}
                className="bg-emerald-700/50 hover:bg-emerald-700 border-white/30 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{bn ? 'প্রিন্ট / সেভ করুন' : 'Print Guidelines'}</span>
              </Button>
              {isAdmin && (
                <Link to="/admin/website?tab=admission-guidelines">
                  <Button
                    type="button"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md gap-1.5 text-xs sm:text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{bn ? 'নির্দেশিকা এডিট করুন (এডমিন)' : 'Edit Guidelines'}</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-border/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bn ? 'সকল বিভাগের ভর্তি কার্যক্রম ও নির্দেশনা নিম্নরূপ:' : 'Admission rules & instructions listed below:'}</span>
          </div>
          {guidelines.helpline_phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{bn ? 'ভর্তি হেল্পলাইন:' : 'Helpline:'}</span>
              <a href={`tel:${guidelines.helpline_phone}`} className="font-bold text-foreground font-mono hover:text-emerald-600 underline">
                {guidelines.helpline_phone}
              </a>
            </div>
          )}
        </div>

        {/* Content Sections */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {activeSections.map((sec, idx) => {
              const IconComp = (sec.icon && SECTION_ICONS[sec.icon]) || BookOpen;
              return (
                <div
                  key={sec.id || idx}
                  className="rounded-2xl border border-slate-200/90 dark:border-border/80 bg-slate-50/50 dark:bg-muted/20 p-5 sm:p-6 space-y-3 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-base sm:text-lg text-foreground leading-snug">
                        {bn ? sec.title_bn : (sec.title_en || sec.title_bn)}
                      </h3>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line space-y-1 pl-1">
                      {bn ? sec.content_bn : (sec.content_en || sec.content_bn)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attached Files & Downloadable Documents */}
          {attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    {bn ? 'সংযুক্ত ফাইল ও ডাউনলোডযোগ্য তথ্যাবলী' : 'Attached Documents & Downloads'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'ভর্তি প্রসপেক্টাস, সিলেবাস বা প্রয়োজনীয় ফরমসমূহ ডাউনলোড করুন।' : 'Download prospectuses, syllabi, or relevant documents.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-4 rounded-2xl border border-slate-200/90 dark:border-border bg-white dark:bg-card hover:border-emerald-500/60 hover:shadow-md transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-emerald-600 transition-colors">
                          {att.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                          {att.file_type && <span className="uppercase font-semibold">{att.file_type}</span>}
                          {att.file_size && <span>• {att.file_size}</span>}
                        </div>
                      </div>
                    </div>
                    {att.file_url ? (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 shrink-0"
                      >
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="w-3.5 h-3.5" />
                          <span>{bn ? 'ডাউনলোড' : 'Download'}</span>
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        {bn ? 'সংযুক্ত নয়' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Call to Action Card */}
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-card border border-emerald-200 dark:border-emerald-800/60 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="max-w-xl mx-auto space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-emerald-950 dark:text-emerald-100">
                {bn ? 'অনলাইনে ভর্তি আবেদন করতে চান?' : 'Ready to Apply for Admission?'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {bn
                  ? 'কাঙ্ক্ষিত বিভাগ ও শ্রেণী নির্বাচন করে খুব সহজেই মাত্র কয়েক মিনিটে ফরমটি পূরণ করে আবেদন সম্পন্ন করুন।'
                  : 'Select your preferred department & class and fill up the application online in just a few minutes.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={onSwitchToApply}
              className="px-8 py-3 rounded-xl font-bold text-sm btn-primary-gradient gap-2 shadow-lg shadow-emerald-600/25"
            >
              <Sparkles className="w-4 h-4" />
              <span>{bn ? 'নতুন ছাত্র ভর্তি আবেদন শুরু করুন' : 'Start Student Application'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionGuidelinesView;
