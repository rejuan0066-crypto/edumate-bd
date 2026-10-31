import { ReactNode } from 'react';
import InstitutionalHeader from './institutional/InstitutionalHeader';
import InstitutionalFooter from './institutional/InstitutionalFooter';
import BackButton from './BackButton';
import '@/styles/institutional-home.css';

interface PublicLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
}

const PublicLayout = ({ children, showBackButton = true }: PublicLayoutProps) => {
  return (
    <div className="institutional-root flex flex-col min-h-screen">
      <InstitutionalHeader />
      <main className="flex-1 w-full bg-[#f8fafc]">
        {showBackButton && (
          <div className="inst-container pt-3">
            <BackButton position="top" />
          </div>
        )}
        {children}
      </main>
      <InstitutionalFooter />
    </div>
  );
};

export default PublicLayout;
