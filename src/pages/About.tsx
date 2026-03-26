import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';

const About = () => {
  const { language } = useLanguage();
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">
          {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us'}
        </h1>
        <div className="card-elevated p-8 prose max-w-none">
          <p className="text-muted-foreground leading-relaxed">
            {language === 'bn'
              ? 'নূরুল ইসলাম মাদরাসা বাংলাদেশের একটি ঐতিহ্যবাহী ইসলামিক শিক্ষা প্রতিষ্ঠান। আমাদের লক্ষ্য হলো কুরআন ও সুন্নাহর আলোকে ছাত্রদের আদর্শ মানুষ হিসেবে গড়ে তোলা। আমরা ইসলামিক শিক্ষার পাশাপাশি আধুনিক জ্ঞান-বিজ্ঞানেও শিক্ষা প্রদান করি। আমাদের অভিজ্ঞ শিক্ষকমণ্ডলী ছাত্রদের সর্বাঙ্গীণ বিকাশে নিরলসভাবে কাজ করে যাচ্ছেন। মাদরাসায় হিফয, নূরানী, এবতেদায়ী ও মুতাওয়াসসিতাহ বিভাগ চালু রয়েছে।'
              : 'Nurul Islam Madrasa is a traditional Islamic educational institution in Bangladesh. Our goal is to build students as ideal human beings in the light of the Quran and Sunnah. Along with Islamic education, we also provide modern knowledge and science education.'}
          </p>
        </div>
      </div>
    </PublicLayout>
  );
};

export default About;
