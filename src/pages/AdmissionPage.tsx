import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

const AdmissionPage = () => {
  const { language } = useLanguage();
  const [sameAddress, setSameAddress] = useState(false);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {language === 'bn' ? 'ভর্তি আবেদন ফর্ম' : 'Admission Application Form'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {language === 'bn' ? 'সকল তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all information correctly'}
        </p>

        <form className="space-y-8">
          {/* Student Details */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '১. ছাত্রের তথ্য' : '1. Student Details'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'bn' ? 'ভর্তি সেশন' : 'Admission Session'}</Label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">২০২৬</SelectItem>
                    <SelectItem value="2025">২০২৫</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'রোল' : 'Roll'}</Label>
                <Input className="bg-background mt-1" placeholder={language === 'bn' ? 'স্বয়ংক্রিয়' : 'Auto'} />
              </div>
              <div>
                <Label>{language === 'bn' ? 'প্রথম নাম' : 'First Name'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'শেষ নাম' : 'Last Name'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'লিঙ্গ' : 'Gender'}</Label>
                <Select>
                  <SelectTrigger className="bg-background mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{language === 'bn' ? 'পুরুষ' : 'Male'}</SelectItem>
                    <SelectItem value="female">{language === 'bn' ? 'মহিলা' : 'Female'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'ধর্ম' : 'Religion'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}</Label>
                <Input type="date" className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)' : 'Birth Reg No (17 digits)'}</Label>
                <Input className="bg-background mt-1" maxLength={17} />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox id="orphan" />
                  <Label htmlFor="orphan">{language === 'bn' ? 'এতিম' : 'Orphan'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="poor" />
                  <Label htmlFor="poor">{language === 'bn' ? 'গরীব' : 'Poor'}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="resident" />
                  <Label htmlFor="resident">{language === 'bn' ? 'আবাসিক' : 'Resident'}</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'bn' ? 'বিভাগ' : 'Division'}</Label>
                <Select><SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dhaka">{language === 'bn' ? 'ঢাকা' : 'Dhaka'}</SelectItem>
                    <SelectItem value="chittagong">{language === 'bn' ? 'চট্টগ্রাম' : 'Chittagong'}</SelectItem>
                    <SelectItem value="rajshahi">{language === 'bn' ? 'রাজশাহী' : 'Rajshahi'}</SelectItem>
                    <SelectItem value="khulna">{language === 'bn' ? 'খুলনা' : 'Khulna'}</SelectItem>
                    <SelectItem value="sylhet">{language === 'bn' ? 'সিলেট' : 'Sylhet'}</SelectItem>
                    <SelectItem value="barisal">{language === 'bn' ? 'বরিশাল' : 'Barisal'}</SelectItem>
                    <SelectItem value="rangpur">{language === 'bn' ? 'রংপুর' : 'Rangpur'}</SelectItem>
                    <SelectItem value="mymensingh">{language === 'bn' ? 'ময়মনসিংহ' : 'Mymensingh'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'জেলা' : 'District'}</Label>
                <Select><SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger><SelectContent><SelectItem value="placeholder">-</SelectItem></SelectContent></Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'উপজেলা' : 'Upazila'}</Label>
                <Select><SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger><SelectContent><SelectItem value="placeholder">-</SelectItem></SelectContent></Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'ইউনিয়ন' : 'Union'}</Label>
                <Select><SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন' : 'Select'} /></SelectTrigger><SelectContent><SelectItem value="placeholder">-</SelectItem></SelectContent></Select>
              </div>
              <div>
                <Label>{language === 'bn' ? 'পোস্ট অফিস' : 'Post Office'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'গ্রাম' : 'Village'}</Label>
                <Input className="bg-background mt-1" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Checkbox id="sameAddr" checked={sameAddress} onCheckedChange={(v) => setSameAddress(!!v)} />
              <Label htmlFor="sameAddr">{language === 'bn' ? 'বর্তমান ঠিকানা স্থায়ী ঠিকানার মতো' : 'Present address same as permanent'}</Label>
            </div>
          </div>

          {/* Parents */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '২. অভিভাবকের তথ্য' : '2. Parents Information'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'bn' ? 'পিতার নাম' : 'Father Name'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'পিতার পেশা' : 'Father Occupation'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'পিতার NID (১০/১৭ ডিজিট)' : 'Father NID (10/17 digits)'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'পিতার মোবাইল' : 'Father Mobile'}</Label>
                <Input className="bg-background mt-1" type="tel" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'মাতার নাম' : 'Mother Name'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'মাতার পেশা' : 'Mother Occupation'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'মাতার NID (১০/১৭ ডিজিট)' : 'Mother NID (10/17 digits)'}</Label>
                <Input className="bg-background mt-1" />
              </div>
              <div>
                <Label>{language === 'bn' ? 'মাতার মোবাইল' : 'Mother Mobile'}</Label>
                <Input className="bg-background mt-1" type="tel" />
              </div>
            </div>
          </div>

          {/* Guardian */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4 pb-2 border-b">
              {language === 'bn' ? '৩. অভিভাবক তথ্য' : '3. Guardian Information'}
            </h2>
            <div className="mb-4">
              <Label>{language === 'bn' ? 'অভিভাবক' : 'Guardian'}</Label>
              <Select>
                <SelectTrigger className="bg-background mt-1"><SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="father">{language === 'bn' ? 'পিতা' : 'Father'}</SelectItem>
                  <SelectItem value="mother">{language === 'bn' ? 'মাতা' : 'Mother'}</SelectItem>
                  <SelectItem value="other">{language === 'bn' ? 'অন্যান্য' : 'Others'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="btn-primary-gradient w-full text-lg py-6">
            {language === 'bn' ? 'আবেদন জমা দিন' : 'Submit Application'}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
};

export default AdmissionPage;
