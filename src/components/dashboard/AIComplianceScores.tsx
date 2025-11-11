import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RAGBadge } from './RAGBadge';

export function AIComplianceScores() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [scores, setScores] = useState<any>(null);

  const getRAGStatus = (score: number): 'green' | 'amber' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'amber';
    return 'red';
  };

  const handleCalculateScores = async () => {
    setIsCalculating(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User practice not found');

      const { data, error } = await supabase.functions.invoke('calculate-compliance-scores', {
        body: { practiceId: userData.practice_id },
      });

      if (error) throw error;

      setScores(data.scores);
      
      toast({
        title: 'Scores Calculated',
        description: 'AI-powered compliance scores have been generated.',
      });
    } catch (error: any) {
      console.error('Error calculating scores:', error);
      toast({
        title: 'Calculation Failed',
        description: error.message || 'Failed to calculate compliance scores. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          AI Compliance Scoring
        </CardTitle>
        <Button 
          onClick={handleCalculateScores}
          disabled={isCalculating}
          size="sm"
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Calculate Scores
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!scores ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Click "Calculate Scores" to generate AI-powered compliance assessments across HIW, CQC, and QOF frameworks.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* HIW Scores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">HIW - Healthcare Inspectorate Wales</h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{scores.hiw.overall_score}%</span>
                  <RAGBadge status={getRAGStatus(scores.hiw.overall_score)} />
                </div>
              </div>
              <div className="pl-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient Experience</span>
                  <span className="font-medium">{scores.hiw.patient_experience}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Safe & Effective Care</span>
                  <span className="font-medium">{scores.hiw.safe_effective_care}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Management & Leadership</span>
                  <span className="font-medium">{scores.hiw.management_leadership}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{scores.hiw.justification}</p>
            </div>

            {/* CQC Scores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">CQC - Care Quality Commission</h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{scores.cqc.overall_score}%</span>
                  <RAGBadge status={getRAGStatus(scores.cqc.overall_score)} />
                </div>
              </div>
              <div className="pl-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Safe</span>
                  <span className="font-medium">{scores.cqc.safe}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effective</span>
                  <span className="font-medium">{scores.cqc.effective}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caring</span>
                  <span className="font-medium">{scores.cqc.caring}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Responsive</span>
                  <span className="font-medium">{scores.cqc.responsive}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Well-led</span>
                  <span className="font-medium">{scores.cqc.well_led}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{scores.cqc.justification}</p>
            </div>

            {/* QOF Scores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">QOF - Quality & Outcomes Framework</h4>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{scores.qof.overall_score}%</span>
                  <RAGBadge status={getRAGStatus(scores.qof.overall_score)} />
                </div>
              </div>
              <div className="pl-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clinical Indicators</span>
                  <span className="font-medium">{scores.qof.clinical_indicators}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Public Health</span>
                  <span className="font-medium">{scores.qof.public_health}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quality Improvement</span>
                  <span className="font-medium">{scores.qof.quality_improvement}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{scores.qof.justification}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
