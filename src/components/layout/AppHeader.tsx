import React from 'react';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppHeaderProps {
  children?: React.ReactNode;
  useLoginStyles?: boolean;
}

export function AppHeader({ children, useLoginStyles = false }: AppHeaderProps) {
  const isMobile = useIsMobile();

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
              src="/icons/reflowaigp-logo.png" 
              alt="ReflowAI GP" 
              className="h-8 sm:h-[4.2rem] w-auto drop-shadow-md"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-2xl font-bold text-foreground truncate">
              GP Surgery Audit & Compliance
            </h1>
            <p className="text-xs text-muted-foreground font-medium hidden sm:block">Professional Healthcare Compliance Management</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <NotificationCenter />
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}