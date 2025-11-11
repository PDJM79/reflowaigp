import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface AppHeaderProps {
  children?: React.ReactNode;
  useLoginStyles?: boolean;
}

export function AppHeader({ children, useLoginStyles = false }: AppHeaderProps) {
  return (
    <header className={`${
      useLoginStyles 
        ? 'bg-cyan-50 dark:bg-card' 
        : 'bg-card'
    } border-b border-border shadow-sm backdrop-blur-sm sticky top-0 z-50`}>
      <div className={`${
        useLoginStyles ? 'w-full' : 'container mx-auto'
      } px-4 py-4 flex justify-between items-center`}>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800/80 dark:bg-slate-900/80 p-2 rounded-lg">
            <img 
              src="/lovable-uploads/0677a790-976c-4155-b715-06fc3d1155a9.png" 
              alt="ReflowAI Logo" 
              className="h-[4.2rem] w-auto drop-shadow-md"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              GP Surgery Audit & Compliance
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Professional Healthcare Compliance Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <ThemeToggle />
          {children}
        </div>
      </div>
    </header>
  );
}