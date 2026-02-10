import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Lightbulb, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function AITaskSuggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stubMessage, setStubMessage] = useState('');

  const handleGenerateSuggestions = async () => {
    if (!user?.practiceId) return;

    setIsGenerating(true);
    setStubMessage('');
    try {
      const response = await fetch(`/api/practices/${user.practiceId}/ai/suggest-tasks`, {
        credentials: 'include',
      });

      if (response.status === 404) {
        setStubMessage('AI task suggestions are not yet available. This feature will be enabled in a future update.');
        toast({
          title: 'Feature Coming Soon',
          description: 'AI task suggestions will be available in a future update.',
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      
      toast({
        title: 'Suggestions Generated',
        description: `${(data.suggestions || []).length} AI-powered task suggestions ready.`,
      });
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      setStubMessage('AI task suggestions are not yet available. This feature will be enabled in a future update.');
      toast({
        title: 'Feature Coming Soon',
        description: 'AI task suggestions will be available in a future update.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card data-testid="card-ai-task-suggestions">
      <CardHeader className="flex flex-row items-center justify-between gap-1">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Task Suggestions
        </CardTitle>
        <Button 
          onClick={handleGenerateSuggestions}
          disabled={isGenerating}
          size="sm"
          data-testid="button-get-suggestions"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get Suggestions
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {stubMessage ? (
          <div className="text-center py-8" data-testid="text-ai-suggestions-stub">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{stubMessage}</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8" data-testid="text-ai-suggestions-empty">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Click "Get Suggestions" to receive AI-powered task recommendations based on your practice's current status.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion: any, index: number) => (
              <div key={index} className="p-4 border rounded-lg space-y-2" data-testid={`card-suggestion-${index}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium" data-testid={`text-suggestion-title-${index}`}>{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{suggestion.reasoning}</p>
                  </div>
                  <Badge 
                    className={
                      suggestion.priority === 'high'
                        ? 'bg-destructive ml-2'
                        : suggestion.priority === 'medium'
                        ? 'bg-warning ml-2'
                        : 'bg-success ml-2'
                    }
                    data-testid={`badge-suggestion-priority-${index}`}
                  >
                    {suggestion.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {suggestion.category}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
