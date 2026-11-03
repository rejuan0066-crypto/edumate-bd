import React, { useState } from 'react';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeeStructure } from '@/hooks/useFeeStructure';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  DollarSign, GraduationCap, Printer, Download, BookOpen,
  HelpCircle, CreditCard, ChevronRight, Sparkles, CheckCircle2,
  FileText, ShieldCheck, AlertCircle, Phone, Mail, Building2,
  Calendar, Layers, ArrowRight, ExternalLink
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  BookOpen,
  GraduationCap,
  Layers,
  FileText,
  DollarSign,
};

export const FeeStructurePage: React.FC = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { feeStructure, isLoading } = useFeeStructure();

  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('all');

  const handlePrint = () => {
    window.print();
  };

  const filteredDivisions = (feeStructure.divisions || []).filter(div => {
    if (selectedDivisionFilter === 'all') return true;
    return div.id === selectedDivisionFilter;
  });

  return (
    <PublicLayout>
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 animate-in fade-in duration-300">
        
        {/* TOP HERO BANNER */}
        <div className="border border-slate-200/90 dark:border-border rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-card">
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
              <DollarSign className="w-80 h-80" />
            </div>

            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs px-3.5 py-1 font-semibold backdrop-blur-sm">
                  💰 {bn ? 'ফি ও খরচ বিবরণী' : 'Fee Structure & Expenses'}
                </Badge>
                {feeStructure.session_badge && (
                  <Badge className="bg-amber-400 text-amber-950 font-bold text-xs px-3 py-1 border-none shadow-sm">
                    {feeStructure.session_badge}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {bn ? feeStructure.page_title_bn : (feeStructure.page_title_en || feeStructure.page_title_bn)}
              </h1>
              <p className="text-sm sm:text-base text-emerald-50 max-w-2xl leading-relaxed">
                {bn ? feeStructure.subtitle_bn : (feeStructure.subtitle_en || feeStructure.subtitle_bn)}
              </p>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Link to="/admission">
                  <Button
                    type="button"
                    className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all gap-2 text-xs sm:text-sm"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>{bn ? 'অনলাইন ভর্তি আবেদন' : 'Apply for Admission'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/fee-payment">
                  <Button
                    type="button"
                    className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition-all gap-2 text-xs sm:text-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{bn ? 'অনলাইনে ফি পরিশোধ করুন' : 'Pay Fees Online'}</span>
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  className="bg-emerald-800/60 hover:bg-emerald-800 border-white/30 text-white font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{bn ? 'প্রিন্ট / সেভ করুন' : 'Print Fee Sheet'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Notice Strip */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border-b border-border/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bn ? 'সকল ফি মাদ্রাসার অনলাইন গেটওয়ে অথবা অফিস কাউন্টারে জমা দেওয়া যাবে।' : 'All fees can be paid via online gateway or accounts counter.'}</span>
            </div>
            {feeStructure.helpline_phone && (
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                <Phone className="w-3.5 h-3.5" />
                <span>{bn ? `হিসাব শাখা হেল্পলাইন: ${feeStructure.helpline_phone}` : `Accounts Helpline: ${feeStructure.helpline_phone}`}</span>
              </div>
            )}
          </div>
        </div>

        {/* DIVISION FILTER TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-600" />
              <span>{bn ? 'বিভাগ ও শ্রেণিভিত্তিক ফি বিবরণী' : 'Class-wise Fee Breakdown'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn ? 'আপনার কাঙ্ক্ষিত বিভাগ অনুযায়ী ফি ও খরচের বিস্তারিত তালিকা নিচে দেখুন' : 'Explore detailed tuition and admission charges by department'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 border border-border/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setSelectedDivisionFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDivisionFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
            >
              {bn ? 'সকল বিভাগ' : 'All Departments'}
            </button>
            {(feeStructure.divisions || []).map(div => (
              <button
                key={div.id}
                type="button"
                onClick={() => setSelectedDivisionFilter(div.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedDivisionFilter === div.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                {bn ? div.division_name_bn : (div.division_name_en || div.division_name_bn)}
              </button>
            ))}
          </div>
        </div>

        {/* FEE CARDS BY DIVISION */}
        <div className="space-y-6">
          {filteredDivisions.map((divGroup) => {
            const Icon = ICON_MAP[divGroup.icon || 'BookOpen'] || BookOpen;

            return (
              <div
                key={divGroup.id}
                className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden"
              >
                {/* Division Header */}
                <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-b border-border/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        {bn ? divGroup.division_name_bn : (divGroup.division_name_en || divGroup.division_name_bn)}
                      </h3>
                      {divGroup.description_bn && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {divGroup.description_bn}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 self-start sm:self-auto">
                    {divGroup.items.length} {bn ? 'টি শ্রেণি তালিকাভুক্ত' : 'Classes'}
                  </Badge>
                </div>

                {/* Table for Large Screens */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground">
                        <th className="py-3.5 px-4 font-bold text-foreground">{bn ? 'শ্রেণি / স্তর' : 'Class / Level'}</th>
                        <th className="py-3.5 px-4 text-emerald-800 dark:text-emerald-300 font-bold">{bn ? 'ভর্তি ফি (এককালীন)' : 'Admission Fee'}</th>
                        <th className="py-3.5 px-4 font-bold">{bn ? 'মাসিক বেতন (অনাবাসিক)' : 'Monthly Tuition'}</th>
                        <th className="py-3.5 px-4 font-bold">{bn ? 'আবাসিক ও খাবার ফি' : 'Residential & Meals'}</th>
                        <th className="py-3.5 px-4 font-bold">{bn ? 'পরীক্ষা ফি' : 'Exam Fee'}</th>
                        <th className="py-3.5 px-4 font-bold">{bn ? 'বিশেষ দ্রষ্টব্য' : 'Notes'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {divGroup.items.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {bn ? item.class_name_bn : (item.class_name_en || item.class_name_bn)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-700 dark:text-emerald-300">
                            {item.admission_fee || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {item.monthly_tuition || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {item.residential_fee || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground">
                            {item.exam_fee || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-xs">
                            {item.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Friendly Card List */}
                <div className="md:hidden divide-y divide-border/60">
                  {divGroup.items.map((item, idx) => (
                    <div key={item.id || idx} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base text-foreground">
                          {bn ? item.class_name_bn : (item.class_name_en || item.class_name_bn)}
                        </span>
                        <Badge className="bg-emerald-600 text-white font-bold text-xs">
                          {item.admission_fee}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="bg-muted/50 p-2.5 rounded-xl border border-border/50">
                          <span className="text-muted-foreground block text-[11px] font-medium">{bn ? 'মাসিক বেতন' : 'Monthly Tuition'}</span>
                          <span className="font-bold text-foreground mt-0.5 block">{item.monthly_tuition}</span>
                        </div>
                        <div className="bg-muted/50 p-2.5 rounded-xl border border-border/50">
                          <span className="text-muted-foreground block text-[11px] font-medium">{bn ? 'আবাসিক/খাবার' : 'Residential'}</span>
                          <span className="font-bold text-foreground mt-0.5 block">{item.residential_fee || '—'}</span>
                        </div>
                        <div className="bg-muted/50 p-2.5 rounded-xl border border-border/50">
                          <span className="text-muted-foreground block text-[11px] font-medium">{bn ? 'পরীক্ষা ফি' : 'Exam Fee'}</span>
                          <span className="font-bold text-foreground mt-0.5 block">{item.exam_fee || '—'}</span>
                        </div>
                        {item.notes && (
                          <div className="bg-muted/50 p-2.5 rounded-xl border border-border/50 col-span-2">
                            <span className="text-muted-foreground block text-[11px] font-medium">{bn ? 'বিশেষ দ্রষ্টব্য' : 'Notes'}</span>
                            <span className="text-foreground mt-0.5 block text-xs">{item.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ADDITIONAL ESTIMATED EXPENSES */}
        {feeStructure.additional_expenses && feeStructure.additional_expenses.length > 0 && (
          <div className="border border-border rounded-2xl bg-card p-6 sm:p-8 space-y-5 shadow-sm">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <span>{bn ? 'আনুমানিক আনুষঙ্গিক অন্যান্য খরচ' : 'Estimated Additional Expenses'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {bn ? 'কিতাব-পুস্তক, ইউনিফর্ম এবং প্রয়োজনীয় শিক্ষা উপকরণের সম্ভাব্য খরচ' : 'Approximate expenses for textbooks, uniforms and academic stationery'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {feeStructure.additional_expenses.map((exp, idx) => (
                <div
                  key={exp.id || idx}
                  className="p-4 sm:p-5 rounded-xl border border-border/80 bg-muted/20 hover:border-emerald-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm text-foreground">
                      {bn ? exp.title_bn : (exp.title_en || exp.title_bn)}
                    </h4>
                    <Badge variant="outline" className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      {exp.frequency}
                    </Badge>
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                    {exp.estimated_cost}
                  </div>
                  {exp.details_bn && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {exp.details_bn}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RULES & PAYMENT POLICIES */}
        {feeStructure.rules && feeStructure.rules.length > 0 && (
          <div className="border border-border rounded-2xl bg-card p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>{bn ? 'ফি পরিশোধের নিয়মাবলী ও শর্তসমূহ' : 'Fee Payment Guidelines & Terms'}</span>
            </h3>

            <div className="space-y-3 pt-1">
              {feeStructure.rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs sm:text-sm text-foreground/90 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATTACHMENTS / DOWNLOADABLE PDF CHARTS */}
        {feeStructure.attachments && feeStructure.attachments.length > 0 && (
          <div className="border border-border rounded-2xl bg-card p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>{bn ? 'ফি চার্ট ও সংযুক্তি ফাইল ডাউনলোড' : 'Download Fee Schedule & Attachments'}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {feeStructure.attachments.map(att => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-emerald-700">
                        {att.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {att.file_type || 'PDF Document'} {att.file_size ? `• ${att.file_size}` : ''}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION CTA BOX */}
        <div className="border border-emerald-600/30 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-extrabold">
              {bn ? 'ভর্তি প্রক্রিয়া শুরু করতে প্রস্তুত?' : 'Ready to start admission?'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              {bn
                ? 'অনলাইন ভর্তি ফরম পূরণ করে আজই আপনার সন্তানের আবেদন নিশ্চিত করুন অথবা অনলাইনে ফি পরিশোধ করুন।'
                : 'Complete the online application form to secure admission or make an online fee payment.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/admission">
              <Button className="bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-6 py-2.5 rounded-xl shadow-lg gap-2 text-xs sm:text-sm">
                <GraduationCap className="w-4 h-4" />
                <span>{bn ? 'অনলাইন ভর্তি ফরম' : 'Admission Form'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/fee-payment">
              <Button className="bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold px-5 py-2.5 rounded-xl shadow-md gap-2 text-xs sm:text-sm">
                <CreditCard className="w-4 h-4" />
                <span>{bn ? 'অনলাইন ফি পেমেন্ট' : 'Online Payment'}</span>
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </PublicLayout>
  );
};

export default FeeStructurePage;
