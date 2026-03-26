import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Plus, Check, X, Clock, Eye, Edit, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type NoticeStatus = 'pending' | 'approved' | 'rejected';

interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  submittedBy: string;
  status: NoticeStatus;
}

const initialNotices: Notice[] = [
  { id: '1', title: 'বার্ষিক পরীক্ষার সময়সূচী প্রকাশিত হয়েছে', content: 'বার্ষিক পরীক্ষা ২০২৬ সালের মার্চ মাসে অনুষ্ঠিত হবে।', date: '২০২৬-০৩-২০', submittedBy: 'মাওলানা আহমেদ', status: 'approved' },
  { id: '2', title: 'রমজান মাসের বিশেষ ক্লাসের সময়সূচী', content: 'রমজান মাসে বিশেষ তারাবীহ ও তাজবীদ ক্লাস পরিচালিত হবে।', date: '২০২৬-০৩-১৫', submittedBy: 'হাফিজ করিম', status: 'pending' },
  { id: '3', title: 'নতুন শিক্ষাবর্ষের ভর্তি চলছে', content: 'নতুন শিক্ষাবর্ষ ২০২৬-এ ভর্তি কার্যক্রম শুরু হয়েছে।', date: '২০২৬-০৩-১০', submittedBy: 'অফিস', status: 'approved' },
  { id: '4', title: 'শিক্ষক নিয়োগ বিজ্ঞপ্তি', content: 'আরবি বিভাগে ২ জন শিক্ষক নিয়োগ দেওয়া হবে।', date: '২০২৬-০৩-০৫', submittedBy: 'হাফিজ রহমান', status: 'rejected' },
  { id: '5', title: 'হিফয বিভাগে বিশেষ প্রোগ্রাম', content: 'হিফয বিভাগে প্রতি শুক্রবার বিশেষ মুহাফালা অনুষ্ঠিত হবে।', date: '২০২৬-০৩-০১', submittedBy: 'মাওলানা আহমেদ', status: 'pending' },
];

const AdminNotices = () => {
  const { language } = useLanguage();
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [filter, setFilter] = useState<NoticeStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const updateStatus = (id: string, status: NoticeStatus) => {
    setNotices(notices.map(n => n.id === id ? { ...n, status } : n));
    const msg = status === 'approved' 
      ? (language === 'bn' ? 'নোটিশ অনুমোদিত হয়েছে' : 'Notice approved')
      : status === 'rejected' 
        ? (language === 'bn' ? 'নোটিশ প্রত্যাখ্যাত হয়েছে' : 'Notice rejected')
        : (language === 'bn' ? 'নোটিশ পেন্ডিং-এ ফেরত পাঠানো হয়েছে' : 'Notice moved to pending');
    toast.success(msg);
  };

  const addNotice = () => {
    if (!newTitle.trim()) return;
    const newNotice: Notice = {
      id: Date.now().toString(), title: newTitle, content: newContent,
      date: new Date().toLocaleDateString('bn-BD'), submittedBy: 'Admin', status: 'pending'
    };
    setNotices([newNotice, ...notices]);
    setNewTitle(''); setNewContent(''); setShowAdd(false);
    toast.success(language === 'bn' ? 'নোটিশ যোগ হয়েছে (অনুমোদনের অপেক্ষায়)' : 'Notice added (pending approval)');
  };

  const filtered = filter === 'all' ? notices : notices.filter(n => n.status === filter);

  const statusLabel = (s: NoticeStatus) => {
    const map = { pending: { bn: 'অপেক্ষমান', en: 'Pending', cls: 'bg-warning/10 text-warning' },
      approved: { bn: 'অনুমোদিত', en: 'Approved', cls: 'bg-success/10 text-success' },
      rejected: { bn: 'প্রত্যাখ্যাত', en: 'Rejected', cls: 'bg-destructive/10 text-destructive' }};
    return map[s];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'নোটিশ ব্যবস্থাপনা' : 'Notice Management'}</h1>
          <Button onClick={() => setShowAdd(!showAdd)} className="btn-primary-gradient"><Plus className="w-4 h-4 mr-1" /> {language === 'bn' ? 'নতুন নোটিশ' : 'New Notice'}</Button>
        </div>

        {showAdd && (
          <div className="card-elevated p-5 space-y-4">
            <Input placeholder={language === 'bn' ? 'নোটিশের শিরোনাম' : 'Notice Title'} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-background" />
            <Textarea placeholder={language === 'bn' ? 'নোটিশের বিবরণ' : 'Notice Content'} value={newContent} onChange={(e) => setNewContent(e.target.value)} className="bg-background" rows={4} />
            <div className="flex gap-2">
              <Button onClick={addNotice} className="btn-primary-gradient">{language === 'bn' ? 'যোগ করুন' : 'Add'}</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>{language === 'bn' ? 'বাতিল' : 'Cancel'}</Button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {f === 'all' ? (language === 'bn' ? 'সকল' : 'All') :
               f === 'pending' ? (language === 'bn' ? 'অপেক্ষমান' : 'Pending') :
               f === 'approved' ? (language === 'bn' ? 'অনুমোদিত' : 'Approved') :
               (language === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected')}
              <span className="ml-1.5 text-xs">({f === 'all' ? notices.length : notices.filter(n => n.status === f).length})</span>
            </button>
          ))}
        </div>

        {/* Notice list */}
        <div className="space-y-3">
          {filtered.map(n => {
            const sl = statusLabel(n.status);
            return (
              <div key={n.id} className="card-elevated p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{n.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sl.cls}`}>{language === 'bn' ? sl.bn : sl.en}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{n.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{n.date}</span>
                      <span>{language === 'bn' ? 'জমাদানকারী: ' : 'By: '}{n.submittedBy}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {n.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(n.id, 'approved')} className="p-2 rounded-lg hover:bg-success/10 text-success" title="Approve"><Check className="w-4 h-4" /></button>
                        <button onClick={() => updateStatus(n.id, 'rejected')} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Reject"><X className="w-4 h-4" /></button>
                      </>
                    )}
                    {n.status === 'approved' && (
                      <button onClick={() => updateStatus(n.id, 'pending')} className="p-2 rounded-lg hover:bg-warning/10 text-warning" title="Move to pending"><RotateCcw className="w-4 h-4" /></button>
                    )}
                    {n.status === 'rejected' && (
                      <button onClick={() => updateStatus(n.id, 'pending')} className="p-2 rounded-lg hover:bg-warning/10 text-warning" title="Move to pending"><RotateCcw className="w-4 h-4" /></button>
                    )}
                    <button className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminNotices;
