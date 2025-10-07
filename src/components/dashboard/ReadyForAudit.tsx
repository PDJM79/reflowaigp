import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, TrendingDown, Target, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ScoreData {
  section_key: string;
  score: number;
  contributors_json: {
    E?: number; // Evidence
    C?: number; // Coverage
    S?: number; // Timeliness
    R?: number; // Review
    Q?: number; // Quality
    X?: number; // Exceptions
    N?: number; // Recency
  };
  gates_json: {
    active?: string[];
    reasons?: string[];
  };
}

interface Target {
  section_key: string | null;
  target_score: number;
}

const RAGColor = (score: number) => {
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
};

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

export function ReadyForAudit() {
  const [activeTab, setActiveTab] = useState<"overview" | "bySection">("overview");

  // Fetch practice country
  const { data: practiceData } = useQuery({
    queryKey: ['practice-country'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userData) return null;

      const { data, error } = await supabase
        .from('practices')
        .select('id, name, audit_country')
        .eq('id', userData.practice_id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch current scores
  const { data: scores, isLoading: scoresLoading } = useQuery({
    queryKey: ['audit-scores'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userData) return [];

      const { data, error } = await supabase
        .from('score_current')
        .select('*')
        .eq('practice_id', userData.practice_id);

      if (error) throw error;
      return data as ScoreData[];
    },
  });

  // Fetch targets
  const { data: targets } = useQuery({
    queryKey: ['audit-targets'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userData) return [];

      const { data, error } = await supabase
        .from('practice_targets')
        .select('*')
        .eq('practice_id', userData.practice_id);

      if (error) throw error;
      return data as Target[];
    },
  });

  // Fetch trend data (last 90 days)
  const { data: trends } = useQuery({
    queryKey: ['audit-trends'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userData) return [];

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data, error } = await supabase
        .from('score_snapshot')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .gte('snapshot_date', ninetyDaysAgo.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (scoresLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ready for Audit</CardTitle>
          <CardDescription>Loading audit readiness scores...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const country = practiceData?.audit_country || 'England';
  const regulatoryBody = country === 'Wales' ? 'HIW' : country === 'Scotland' ? 'HIS' : 'CQC';
  const overallScore = scores?.find(s => s.section_key === 'Overall');
  const sectionScores = scores?.filter(s => s.section_key !== 'Overall') || [];
  const overallTarget = targets?.find(t => t.section_key === null);

  // Calculate areas of concern (top 5 gaps by impact)
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
    <div className="space-y-6">
      {/* Overall Readiness */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-2xl">Ready for Audit</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {country} - {regulatoryBody}
                </Badge>
              </div>
              <CardDescription>
                Overall audit readiness score and trends for {regulatoryBody} compliance
              </CardDescription>
            </div>
            {overallScore && (
              <Badge variant={RAGBadgeVariant(overallScore.score)} className="text-lg px-4 py-2">
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
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p>No audit scores available yet</p>
                <p className="text-sm">Scores will be calculated as you complete tasks</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Areas of Concern */}
      {areasOfConcern.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Areas of Concern</CardTitle>
            <CardDescription>Top gaps requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {areasOfConcern.map((area) => (
                <div key={area.section} className="border rounded-lg p-4 space-y-2">
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

      {/* By Section Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scores by Section</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sectionScores.map((score) => {
              const target = targets?.find(t => t.section_key === score.section_key);
              const meetsTarget = target ? score.score >= target.target_score : false;

              return (
                <div key={score.section_key} className="flex items-center justify-between py-2 border-b last:border-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
