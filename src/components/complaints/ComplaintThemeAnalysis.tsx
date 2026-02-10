import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export function ComplaintThemeAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: latestAnalysis, refetch } = useQuery({
    queryKey: ['complaint-themes', user?.practiceId],
    queryFn: async () => {
      return null;
    },
    enabled: !!user?.practiceId,
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      toast({
        title: 'Feature Unavailable',
        description: 'AI complaint theme analysis is not yet available through the API.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const themes = (latestAnalysis as any)?.themes || [];
  const sentiment = (latestAnalysis as any)?.sentiment || { positive: 0, neutral: 0, negative: 0 };
  const insights = (latestAnalysis as any)?.insights || '';
  const recommendations = (latestAnalysis as any)?.recommendations || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Theme Analysis
        </CardTitle>
        <Button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analysing...
            </>
          ) : (
            'Analyse Complaints'
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!latestAnalysis ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No AI analysis available yet. Click "Analyse Complaints" to generate insights.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-success">{sentiment.positive}%</p>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold">{sentiment.neutral}%</p>
                <p className="text-xs text-muted-foreground">Neutral</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold text-destructive">{sentiment.negative}%</p>
                <p className="text-xs text-muted-foreground">Negative</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Key Themes</h4>
              {themes.map((theme: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{theme.name}</p>
                      <p className="text-sm text-muted-foreground">{theme.count} complaints</p>
                    </div>
                  </div>
                  <Badge 
                    className={
                      theme.severity_level === 'high'
                        ? 'bg-destructive' 
                        : theme.severity_level === 'medium'
                        ? 'bg-warning'
                        : 'bg-success'
                    }
                  >
                    {theme.severity_level}
                  </Badge>
                </div>
              ))}
            </div>

            {insights && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">AI Insights</h4>
                <p className="text-sm text-muted-foreground">{insights}</p>
              </div>
            )}

            {recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                <ul className="space-y-2">
                  {recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Last analysed: {new Date((latestAnalysis as any).created_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
