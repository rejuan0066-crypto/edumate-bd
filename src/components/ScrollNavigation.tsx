import { useState, useEffect } from 'react';
import { ArrowDown } from 'lucide-react';

const ScrollNavigation = () => {
  const [showBottom, setShowBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const atBottom = scrollY + winHeight >= docHeight - 20;

      setShowBottom(!atBottom && docHeight > winHeight + 100);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const btnClass =
    'w-10 h-10 rounded-full bg-emerald-600/80 backdrop-blur-md text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border border-emerald-400/20';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <button
        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
        className={`${btnClass} ${showBottom ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="w-5 h-5" strokeWidth={2} />
      </button>
    </div>
  );
};

export default ScrollNavigation;
