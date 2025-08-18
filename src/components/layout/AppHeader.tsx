interface AppHeaderProps {
  children?: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <img 
            src="/lovable-uploads/0677a790-976c-4155-b715-06fc3d1155a9.png" 
            alt="ReflowAI Logo" 
            className="h-12 w-auto"
          />
          <div>
            <h1 className="text-2xl font-bold text-primary">Practice Processes</h1>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}