interface AppHeaderProps {
  children?: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img 
            src="/lovable-uploads/0677a790-976c-4155-b715-06fc3d1155a9.png" 
            alt="ReflowAI Logo" 
            className="h-12 w-auto drop-shadow-md"
          />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
              GP Surgery Audit & Compliance
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Professional Healthcare Compliance Management</p>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}