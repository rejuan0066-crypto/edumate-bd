import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  divisions: Array<{ name: string; nameEn: string; icon: string }>;
  language: string;
  t: (key: string) => string;
}

const HomeAdmissionButtons = ({ divisions, language, t }: Props) => {
  const bn = language === 'bn';

  return (
    <div className="card-elevated overflow-hidden h-full flex flex-col">
      <div className="bg-accent px-4 py-3">
        <h3 className="text-sm font-bold text-accent-foreground font-display text-center flex items-center justify-center gap-2">
          <GraduationCap className="w-4 h-4" />
          {bn ? 'অনলাইন এডমিশন' : 'Online Admission'}
        </h3>
      </div>
      <div className="flex-1 p-4 flex flex-col gap-3 justify-center">
        {divisions.map((div, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            viewport={{ once: true }}
          >
            <Link
              to="/admission"
              className="block w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-center text-sm font-bold hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {bn ? div.name : div.nameEn}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HomeAdmissionButtons;
