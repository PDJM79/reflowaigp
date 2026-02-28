import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertCircle, Target, CheckCircle2, AlertTriangle, Sparkles, Loader2, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ScoreData {
  section_key: string;
  score: number;
  contributors_json: {
    E?: number;
    C?: number;
    S?: number;
    R?: number;
    Q?: number;
    X?: number;
    N?: number;
  };
  gates_json: {
    active?: string[];
    reasons?: string[];
  };
}

interface TargetData {
  section_key: string | null;
  target_score: number;
}

const RAGBadgeVariant = (score: number) => {
  if (score >= 85) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
};

const SECTION_LABELS: Record<string, string> = {
  FridgeTemps: "Fridge Temperatures",
  InfectionControlAudit: "Infection Control Audit",
  DailyCleaning: "Daily Cleaning",
  FireRisk: "Fire Risk Assessment",
  HSToolkit: "H&S Toolkit",
  Complaints: "Complaints",
  HR_Training: "HR Training",
  HR_Appraisals: "HR Appraisals",
  HR_Hiring: "HR Hiring/RTW",
  MonthEndScripts: "Month-end Scripts",
  EnhancedClaims: "Enhanced Service Claims",
  InsuranceMedicals: "Insurance/Medicals",
  Policies: "Policies/Protocols",
  Incidents: "Risk & Incidents",
};

// Maps task.module values → section_key used by this component
const MODULE_TO_SECTION: Record<string, string> = {
  ipc: "InfectionControlAudit",
  cleaning: "DailyCleaning",
  compliance: "FireRisk",
  complaints: "Complaints",
  training: "HR_Training",
  hr: "HR_Appraisals",
  policies: "Policies",
  incidents: "Incidents",
};

function computeScore(tasks: { status: string; due_at: string; completed_at: string | null }[]) {
  const total = tasks.length;
  if (total === 0) return { score: 100, C: 100, S: 100 };
  const closedOnTime = tasks.filter(
    t => t.status === 'closed' && t.completed_at && new Date(t.completed_at) <= new Date(t.due_at)
  ).length;
  const closedLate = tasks.filter(
    t => t.status === 'closed' && t.completed_at && new Date(t.completed_at) > new Date(t.due_at)
  ).length;
  const totalClosed = closedOnTime + closedLate;
  const score = Math.round((closedOnTime + closedLate * 0.7) / total * 100);
  const C = Math.round(totalClosed / total * 100);
  const S = totalClosed > 0 ? Math.round(closedOnTime / totalClosed * 100) : 0;
  return { score, C, S };
}

const DEFAULT_TARGETS: TargetData[] = [
  { section_key: null, target_score: 85 },
  ...Object.values(MODULE_TO_SECTION).map(key => ({ section_key: key, target_score: 85 })),
];

interface AIImprovementTipsProps {
  section: string;
  score: number;
  target: number;
  gap: number;
  contributors: any;
  country: string;
}

function AIImprovementTips({ section, score, target, gap, contributors, country }: AIImprovementTipsProps) {
  const [showTips, setShowTips] = useState(false);
  const [tips, setTips] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stubMessage, setStubMessage] = useState('');
  const { user } = useAuth();

  const handleGetTips = async () => {
    setShowTips(true);
    setIsLoading(true);
    setStubMessage('');
    try {
      const response = await fetch(`/api/practices/${user?.practiceId}/ai/suggest-improvements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ section: SECTION_LABELS[section] || section, score, target, gap, contributors, country }),
      });

      if (response.status === 404) {
        setStubMessage('AI improvement tips are not yet available. This feature will be enabled in a future update.');
        return;
      }

      if (!response.ok) throw new Error('Failed to get tips');

      const data = await response.json();
      setTips(data.tips);
    } catch (error) {
      setStubMessage('AI improvement tips are not yet available. This feature will be enabled in a future update.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!showTips) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={handleGetTips}
        data-testid={`button-get-tips-${section}`}
      >
        <Sparkles className="h-3 w-3 mr-2" />
        Get AI Improvement Tips
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating AI suggestions...</span>
      </div>
    );
  }

  if (stubMessage) {
    return (
      <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-muted-foreground">{stubMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
      <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">AI Suggestions:</p>
        <p className="text-muted-foreground whitespace-pre-line">{tips}</p>
      </div>
    </div>
  );
}

export function ReadyForAudit() {
  const { user } = useAuth();
  const practiceId = user?.practiceId;
  const country = (user?.practice?.country || 'England').toLowerCase();
  const regulatoryBody = country === 'wales' ? 'Health Inspectorate Wales' : country === 'scotland' ? 'Healthcare Improvement Scotland' : 'Care Quality Commission';

  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['audit-scores', practiceId],
    queryFn: async (): Promise<ScoreData[]> => {
      if (!practiceId) return [];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('status, due_at, completed_at, module')
        .eq('practice_id', practiceId)
        .gte('due_at', thirtyDaysAgo.toISOString())
        .lte('due_at', now.toISOString());

      if (error || !tasks || tasks.length === 0) return [];

      // Group by module
      const groups: Record<string, typeof tasks> = {};
      for (const task of tasks) {
        const mod = task.module || 'other';
        if (!groups[mod]) groups[mod] = [];
        groups[mod].push(task);
      }

      const result: ScoreData[] = [];

      // Per-module section scores
      for (const [mod, modTasks] of Object.entries(groups)) {
        const sectionKey = MODULE_TO_SECTION[mod];
        if (!sectionKey) continue;
        const { score, C, S } = computeScore(modTasks);
        result.push({ section_key: sectionKey, score, contributors_json: { C, S }, gates_json: {} });
      }

      // Overall score
      const { score: overallScore, C, S } = computeScore(tasks);
      result.push({ section_key: 'Overall', score: overallScore, contributors_json: { C, S }, gates_json: {} });

      return result;
    },
    enabled: !!practiceId,
  });

  const { data: targets } = useQuery({
    queryKey: ['audit-targets', practiceId],
    queryFn: async (): Promise<TargetData[]> => {
      if (!practiceId) return [];
      return DEFAULT_TARGETS;
    },
    enabled: !!practiceId,
  });

  if (scoresLoading) {
    return (
      <Card data-testid="card-audit-loading">
        <CardHeader>
          <CardTitle>Ready for Audit</CardTitle>
          <CardDescription>Loading audit readiness scores...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const overallScore = scores?.find(s => s.section_key === 'Overall');
  const sectionScores = scores?.filter(s => s.section_key !== 'Overall') || [];
  const overallTarget = targets?.find(t => t.section_key === null);

  const areasOfConcern = sectionScores
    .map(score => {
      const target = targets?.find(t => t.section_key === score.section_key);
      const gap = target ? target.target_score - score.score : 0;
      return {
        section: score.section_key,
        score: score.score,
        target: target?.target_score || 85,
        gap,
        gates: score.gates_json,
        contributors: score.contributors_json,
      };
    })
    .filter(item => item.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  return (
    <div className="space-y-6" data-testid="section-ready-for-audit">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-2xl">Ready for Audit</CardTitle>
                <Badge variant="outline" className="text-xs">
                  Regulator: {regulatoryBody}
                </Badge>
              </div>
              <CardDescription>
                Overall audit readiness score and trends for {regulatoryBody} compliance
              </CardDescription>
            </div>
            {overallScore && (
              <Badge variant={RAGBadgeVariant(overallScore.score)} className="text-lg px-4 py-2" data-testid="badge-overall-audit-score">
                {overallScore.score}/100
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overallScore && (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={overallScore.score} className="h-4" />
                  </div>
                  {overallTarget && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4" />
                      <span>Target: {overallTarget.target_score}</span>
                      {overallScore.score >= overallTarget.target_score ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {!overallScore && (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-audit-scores">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p>No audit scores available yet</p>
                <p className="text-sm">Scores will be calculated as you complete tasks</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {areasOfConcern.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas of Concern</CardTitle>
            <CardDescription>Top gaps requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {areasOfConcern.map((area) => (
                <div key={area.section} className="border rounded-lg p-4 space-y-2" data-testid={`card-concern-${area.section}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{SECTION_LABELS[area.section] || area.section}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Current: {area.score}</span>
                        <span>•</span>
                        <span>Target: {area.target}</span>
                        <span>•</span>
                        <span className="text-amber-600">Gap: {area.gap} points</span>
                      </div>
                    </div>
                    <Badge variant={RAGBadgeVariant(area.score)}>
                      {area.score}/100
                    </Badge>
                  </div>

                  <AIImprovementTips 
                    section={area.section}
                    score={area.score}
                    target={area.target}
                    gap={area.gap}
                    contributors={area.contributors}
                    country={country}
                  />
                  
                  {area.gates?.active && area.gates.active.length > 0 && (
                    <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium">Active Gates:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {area.gates.reasons?.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {area.contributors && (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {area.contributors.C !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Coverage:</span>{" "}
                          <span className="font-medium">{Math.round(area.contributors.C)}%</span>
                        </div>
                      )}
                      {area.contributors.S !== undefined && (
                        <div>
                          <span className="text-muted-foreground">On-time:</span>{" "}
                          <span className="font-medium">{Math.round(area.contributors.S)}%</span>
                        </div>
                      )}
                      {area.contributors.E !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Evidence:</span>{" "}
                          <span className="font-medium">{Math.round(area.contributors.E)}%</span>
                        </div>
                      )}
                      {area.contributors.R !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Sign-off:</span>{" "}
                          <span className="font-medium">{Math.round(area.contributors.R)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Scores by Section</CardTitle>
        </CardHeader>
        <CardContent>
          {sectionScores.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground" data-testid="text-no-section-scores">
              <p>No section scores available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sectionScores.map((score) => {
                const target = targets?.find(t => t.section_key === score.section_key);
                const meetsTarget = target ? score.score >= target.target_score : false;

                return (
                  <div key={score.section_key} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`row-section-${score.section_key}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{SECTION_LABELS[score.section_key] || score.section_key}</span>
                        {meetsTarget && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      </div>
                      <Progress value={score.score} className="h-2 mt-1" />
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      {target && (
                        <span className="text-sm text-muted-foreground">
                          Target: {target.target_score}
                        </span>
                      )}
                      <Badge variant={RAGBadgeVariant(score.score)}>
                        {score.score}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
