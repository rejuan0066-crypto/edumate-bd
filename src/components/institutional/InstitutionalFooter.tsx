import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

interface InstitutionalFooterProps {
  onDepartmentSelect?: (deptKey: string) => void;
}

export const InstitutionalFooter = ({ onDepartmentSelect }: InstitutionalFooterProps) => {
  const { settings } = useWebsiteSettings();

  const instName = settings.institution_name || 'আল আরাবিয়া ছোবহানিয়া মাদ্রাসা ও এতিমখানা';
  const phone = settings.phone || '01749842401';
  const email = settings.email || 'info@subhania.edu.bd';
  const address = settings.address || 'খাজাঞ্চি রোড, এমএইচ সেন্টার, বিশ্বনাথ, সিলেট, বাংলাদেশ';

  const handleDeptClick = (key: string) => {
    if (onDepartmentSelect) {
      onDepartmentSelect(key);
    }
  };

  return (
    <footer className="inst-footer">
      <div className="inst-container">
        <div className="footer-columns">
          <div className="footer-col">
            <h4>{instName}</h4>
            <p style={{ lineHeight: 1.6, marginBottom: '12px', color: '#94a3b8' }}>
              বিশুদ্ধ কুরআন শিক্ষাদান ও সমাজের সুবিধাবঞ্চিত এতিম শিশুদের দ্বীনি ও নৈতিক শিক্ষায় গড়ে তোলার একটি ঐতিহ্যবাহী শীর্ষ প্রতিষ্ঠান।
            </p>
            <div style={{ color: '#e2e8f0', fontWeight: 600 }}>
              <Phone className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
              হেল্পলাইন: {phone}
            </div>
          </div>

          <div className="footer-col">
            <h4>গুরুত্বপূর্ণ লিংক</h4>
            <ul>
              <li>
                <Link to="/admission">ভর্তি নির্দেশিকা ও তথ্য</Link>
              </li>
              <li>
                <Link to="/notices">একাডেমিক ক্যালেন্ডার ও ছুটি</Link>
              </li>
              <li>
                <Link to="/notices">দাপ্তরিক নোটিশ ও সার্কুলার</Link>
              </li>
              <li>
                <Link to="/about#principal-message">পরিচালনা পরিষদ ও বাণী</Link>
              </li>
              <li>
                <Link to="/result">পরীক্ষার ফলাফল অনুসন্ধান</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>শিক্ষা বিভাগসমূহ</h4>
            <ul>
              <li>
                <a href="/#departments" onClick={() => handleDeptClick('noorani')}>
                  নূরানী কিন্ডারগার্টেন
                </a>
              </li>
              <li>
                <a href="/#departments" onClick={() => handleDeptClick('nazera')}>
                  নাজেরা কুরআন বিভাগ
                </a>
              </li>
              <li>
                <a href="/#departments" onClick={() => handleDeptClick('hifz')}>
                  হিফজুল কুরআনুল কারীম
                </a>
              </li>
              <li>
                <a href="/#departments" onClick={() => handleDeptClick('kitab')}>
                  কিতাব ও আরবি ভাষা
                </a>
              </li>
              <li>
                <Link to="/donation">এতিমখানা লিল্লাহ বোর্ডিং</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>দাপ্তরিক ঠিকানা</h4>
            <p style={{ color: '#94a3b8', lineHeight: 1.6, marginBottom: '10px' }}>
              {address}
            </p>
            <div style={{ color: '#94a3b8' }}>
              ইমেইল: {email}
              <br />
              ওয়েব: www.subhania.edu.bd
            </div>
          </div>
        </div>

        <div className="copyright-strip">
          © ২০২৬ {instName} • সর্বস্বত্ব সংরক্ষিত • কারিগরি সহায়তায়: এডুমেট বিডি
        </div>
      </div>
    </footer>
  );
};

export default InstitutionalFooter;
