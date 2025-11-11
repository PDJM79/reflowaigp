import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const ComplaintThemeAnalysis = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['user-practice', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch latest theme analysis
  const { data: latestAnalysis } = useQuery({
    queryKey: ['complaints-themes', userData?.practice_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('complaints_themes')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('analysis_period_start', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!userData?.practice_id,
  });

  // Run AI analysis mutation (placeholder - would call edge function)
  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);
      
      // Get complaints for the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data: complaints } = await (supabase as any)
        .from('complaints')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .gte('received_date', threeMonthsAgo.toISOString().split('T')[0]);

      if (!complaints || complaints.length === 0) {
        throw new Error('No complaints to analyze in the last 3 months');
      }

      // TODO: Call Lovable AI edge function for theme analysis
      // For now, create a placeholder analysis
      const mockThemes = [
        { theme: 'Appointment Availability', count: 5, percentage: 35 },
        { theme: 'Staff Attitude', count: 3, percentage: 21 },
        { theme: 'Waiting Times', count: 3, percentage: 21 },
        { theme: 'Communication', count: 2, percentage: 14 },
        { theme: 'Prescriptions', count: 1, percentage: 7 },
      ];

      const mockSentiment = {
        positive: 1,
        neutral: 3,
        negative: 8,
        very_negative: 2,
      };

      const { error } = await (supabase as any)
        .from('complaints_themes')
        .insert({
          practice_id: userData.practice_id,
          analysis_period_start: threeMonthsAgo.toISOString().split('T')[0],
          analysis_period_end: new Date().toISOString().split('T')[0],
          themes: mockThemes,
          sentiment_breakdown: mockSentiment,
          total_complaints: complaints.length,
          analyzed_by: 'placeholder-system',
        });

      if (error) throw error;

      setAnalyzing(false);
    },
    onSuccess: () => {
      toast({
        title: 'Analysis Complete',
        description: 'AI theme analysis has been generated',
      });
      queryClient.invalidateQueries({ queryKey: ['complaints-themes'] });
    },
    onError: (error: any) => {
      setAnalyzing(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!latestAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Theme Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No theme analysis available yet</p>
            <Button onClick={() => runAnalysisMutation.mutate()} disabled={analyzing}>
              <Brain className="h-4 w-4 mr-2" />
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const themes = latestAnalysis.themes || [];
  const sentiment = latestAnalysis.sentiment_breakdown || {};

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Theme Analysis
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => runAnalysisMutation.mutate()} disabled={analyzing}>
          <TrendingUp className="h-4 w-4 mr-2" />
          {analyzing ? 'Analyzing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Analysis Period */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(latestAnalysis.analysis_period_start).toLocaleDateString()} - {new Date(latestAnalysis.analysis_period_end).toLocaleDateString()}
            </span>
            <Badge variant="secondary">{latestAnalysis.total_complaints} complaints</Badge>
          </div>

          {/* Top Themes */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Top Complaint Themes</h4>
            {themes.map((theme: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{theme.theme}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary rounded-full h-2" 
                      style={{ width: `${theme.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-bold">{theme.count}</p>
                  <p className="text-xs text-muted-foreground">{theme.percentage}%</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sentiment Breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Sentiment Distribution</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 border rounded">
                <p className="text-2xl font-bold text-success">{sentiment.positive || 0}</p>
                <p className="text-xs text-muted-foreground">Positive</p>
              </div>
              <div className="text-center p-2 border rounded">
                <p className="text-2xl font-bold">{sentiment.neutral || 0}</p>
                <p className="text-xs text-muted-foreground">Neutral</p>
              </div>
              <div className="text-center p-2 border rounded">
                <p className="text-2xl font-bold text-warning">{sentiment.negative || 0}</p>
                <p className="text-xs text-muted-foreground">Negative</p>
              </div>
              <div className="text-center p-2 border rounded">
                <p className="text-2xl font-bold text-destructive">{sentiment.very_negative || 0}</p>
                <p className="text-xs text-muted-foreground">Very Neg.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
