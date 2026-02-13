import React from 'react';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { PracticeSwitcher } from '@/components/layout/PracticeSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

interface AppHeaderProps {
  children?: React.ReactNode;
  useLoginStyles?: boolean;
}

export function AppHeader({ children, useLoginStyles = false }: AppHeaderProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  return (
    <header className={`${
      useLoginStyles 
        ? 'bg-cyan-50 dark:bg-card' 
        : 'bg-card'
    } border-b border-border shadow-sm backdrop-blur-sm sticky top-0 z-50`}>
      <div className={`${
        useLoginStyles ? 'w-full' : 'container mx-auto'
      } px-2 sm:px-4 py-2 sm:py-4 flex justify-between items-center`}>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="bg-slate-800/80 dark:bg-slate-900/80 p-1 sm:p-2 rounded-lg flex-shrink-0">
            <img 
              src="/lovable-uploads/0677a790-976c-4155-b715-06fc3d1155a9.png" 
              alt="ReflowAI Logo" 
              className="h-8 sm:h-[4.2rem] w-auto drop-shadow-md"
            />
          </div>
          {!isMobile && (
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                GP Surgery Audit & Compliance
              </h1>
              <p className="text-xs text-muted-foreground font-medium hidden sm:block">Professional Healthcare Compliance Management</p>
            </div>
          )}
          {/* Practice Switcher - only show when logged in */}
          {user && (
            <div className="hidden sm:block border-l border-border pl-3 ml-2">
              <PracticeSwitcher />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Mobile Practice Switcher */}
          {user && isMobile && <PracticeSwitcher />}
          <NotificationCenter />
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}