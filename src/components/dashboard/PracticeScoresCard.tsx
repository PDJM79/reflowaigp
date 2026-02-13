import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Shield, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ragFromScore, ragColor, ragLabel } from '@/lib/scoring';
import { toast } from '@/components/ui/use-toast';

interface ScoresData {
  asOf: string;
  window: {
    start: string;
    end: string;
  };
  compliance: {
    score: number;
    totalDue: number;
    completedOnTime: number;
    completedLate: number;
    incompleteDue: number;
  };
  fitForAudit: {
    score: number;
    auditableDue: number;
    auditablePass: number;
  };
}

const WINDOW_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
];

export function PracticeScoresCard() {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoresData | null>(null);
  const [windowDays, setWindowDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(windowDays));

      const { data, error: fnError } = await supabase.functions.invoke('calculate-compliance-scores', {
        body: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }
      });

      if (fnError) {
        throw fnError;
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to fetch scores');
      }

      // If the edge function returns AI-based scores, extract compliance metrics
      if (data.metrics) {
        const metrics = data.metrics;
        setScores({
          asOf: new Date().toISOString(),
          window: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          compliance: {
            score: metrics.complianceScore || 0,
            totalDue: metrics.totalTasks || 0,
            completedOnTime: metrics.completedOnTime || 0,
            completedLate: metrics.completedLate || 0,
            incompleteDue: metrics.overdueTasks || 0,
          },
          fitForAudit: {
            score: Math.round((metrics.trainingCompliance + metrics.dbsCompliance + metrics.ipcCompletionRate) / 3) || 0,
            auditableDue: 0,
            auditablePass: 0,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scores');
      toast({
        title: 'Error loading scores',
        description: err instanceof Error ? err.message : 'Failed to fetch scores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [windowDays]);

  const complianceRag = scores ? ragFromScore(scores.compliance.score) : 'red';
  const fitRag = scores ? ragFromScore(scores.fitForAudit.score) : 'red';

  const RagIcon = ({ rag }: { rag: 'green' | 'amber' | 'red' }) => {
    switch (rag) {
      case 'green': return <CheckCircle className="h-5 w-5" style={{ color: ragColor(rag) }} />;
      case 'amber': return <AlertTriangle className="h-5 w-5" style={{ color: ragColor(rag) }} />;
      case 'red': return <AlertTriangle className="h-5 w-5" style={{ color: ragColor(rag) }} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Practice Scores
            </CardTitle>
            <CardDescription>Compliance & Fit for Audit metrics</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={windowDays} onValueChange={setWindowDays}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={fetchScores} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Calculating scores...</span>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchScores}>
              Retry
            </Button>
          </div>
        ) : scores ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Compliance Score */}
            <div className="p-5 rounded-xl border bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-base">Compliance Score</span>
              </div>
              
              <div className="text-center mb-4">
                <div 
                  className="text-5xl font-bold"
                  style={{ color: ragColor(complianceRag) }}
                >
                  {scores.compliance.score}%
                </div>
                <Badge 
                  variant="outline" 
                  className="mt-3"
                  style={{ 
                    borderColor: ragColor(complianceRag),
                    color: ragColor(complianceRag),
                  }}
                >
                  <RagIcon rag={complianceRag} />
                  <span className="ml-1.5">{ragLabel(complianceRag)}</span>
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>On-time</span>
                  <span className="font-medium text-foreground">{scores.compliance.completedOnTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Late</span>
                  <span className="font-medium text-foreground">{scores.compliance.completedLate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Incomplete</span>
                  <span className="font-medium text-destructive">{scores.compliance.incompleteDue}</span>
                </div>
              </div>
            </div>

            {/* Fit for Audit Score */}
            <div className="p-5 rounded-xl border bg-gradient-to-br from-background to-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-base">Fit for Audit</span>
              </div>
              
              <div className="text-center mb-4">
                <div 
                  className="text-5xl font-bold"
                  style={{ color: ragColor(fitRag) }}
                >
                  {scores.fitForAudit.score}%
                </div>
                <Badge 
                  variant="outline" 
                  className="mt-3"
                  style={{ 
                    borderColor: ragColor(fitRag),
                    color: ragColor(fitRag),
                  }}
                >
                  <RagIcon rag={fitRag} />
                  <span className="ml-1.5">{ragLabel(fitRag)}</span>
                </Badge>
              </div>
              
              <div className="text-sm text-muted-foreground pt-4 border-t">
                <p>Would the practice pass a CQC/HIW audit today?</p>
                <p className="mt-2 text-xs">
                  Based on auditable task completion and evidence requirements.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
