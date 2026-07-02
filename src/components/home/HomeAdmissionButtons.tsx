import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Users, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  // Kept for backward compatibility but no longer used for rendering — we always
  // pull divisions/classes live from the backend so the public page reflects
  // the current academic structure.
  divisions?: Array<{ name: string; nameEn: string; icon?: string }>;
  language: string;
  t: (key: string) => string;
}

const HomeAdmissionButtons = ({ language }: Props) => {
  const bn = language === 'bn';
  const navigate = useNavigate();
  const [openDivId, setOpenDivId] = useState<string | null>(null);

  const { data: dbDivisions = [], isLoading } = useQuery({
    queryKey: ['public-divisions-with-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name, name_bn, sort_order, classes(id, name, name_bn, sort_order, is_active)')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const openDiv = useMemo(
    () => dbDivisions.find((d: any) => d.id === openDivId) || null,
    [openDivId, dbDivisions],
  );

  const classesForDiv = useMemo(() => {
    if (!openDiv) return [];
    return ((openDiv as any).classes || [])
      .filter((c: any) => c.is_active)
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [openDiv]);

  const handleClassClick = (classId: string) => {
    setOpenDivId(null);
    navigate(`/admission?class=${classId}`);
  };

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-accent px-4 py-3">
        <h2 className="text-sm font-bold text-accent-foreground font-display text-center flex items-center justify-center gap-2">
          <GraduationCap className="w-4 h-4" />
          {bn ? 'অনলাইন এডমিশন' : 'Online Admission'}
        </h2>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3 justify-center">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            {bn ? 'লোড হচ্ছে...' : 'Loading...'}
          </div>
        )}
        {!isLoading && dbDivisions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            {bn ? 'কোনো বিভাগ পাওয়া যায়নি' : 'No divisions found'}
          </p>
        )}
        {dbDivisions.map((div: any, i: number) => (
          <motion.div
            key={div.id}
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <button
              type="button"
              onClick={() => setOpenDivId(div.id)}
              className="block w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-center text-sm font-bold hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {bn ? (div.name_bn || div.name) : (div.name || div.name_bn)}
            </button>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: (dbDivisions.length || 0) * 0.08 }}
          viewport={{ once: true }}
          className="pt-2 mt-1 border-t border-border/40"
        >
          <Link
            to="/parent"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg text-center text-sm font-bold hover:bg-secondary/80 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Users className="w-4 h-4" />
            {bn ? 'অভিভাবক লগইন' : 'Parent Login'}
          </Link>
        </motion.div>
      </div>

      <Dialog open={!!openDivId} onOpenChange={(o) => !o && setOpenDivId(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="w-5 h-5 text-primary" />
              {bn
                ? `${openDiv ? (openDiv as any).name_bn || (openDiv as any).name : ''} — শ্রেণি নির্বাচন`
                : `${openDiv ? (openDiv as any).name || (openDiv as any).name_bn : ''} — Select Class`}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            <AnimatePresence>
              {classesForDiv.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {bn ? 'এই বিভাগের জন্য কোনো শ্রেণি কনফিগার করা হয়নি' : 'No classes configured for this division'}
                </p>
              )}
              {classesForDiv.map((c: any, idx: number) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleClassClick(c.id)}
                  className="block w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-center text-sm font-semibold hover:bg-primary/90 transition shadow-sm"
                >
                  {bn ? (c.name_bn || c.name) : (c.name || c.name_bn)}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setOpenDivId(null)}
            className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" /> {bn ? 'বিভাগে ফিরে যান' : 'Back to divisions'}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeAdmissionButtons;
