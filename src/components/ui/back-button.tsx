import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BackButtonProps {
  fallbackPath?: string;
  label?: string;
}

export function BackButton({ fallbackPath = '/dashboard', label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size={isMobile ? "icon" : "default"} 
      onClick={handleBack}
      className="flex-shrink-0"
    >
      <ArrowLeft className="h-4 w-4" />
      {!isMobile && <span className="ml-2">{label}</span>}
    </Button>
  );
}
