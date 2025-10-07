import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SectionScoreBadgeProps {
  sectionKey: string;
  sectionLabel: string;
}

const RAGBadgeVariant = (score: number) => {
  if (score >= 85) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
};

export function SectionScoreBadge({ sectionKey, sectionLabel }: SectionScoreBadgeProps) {
  const { data: scoreData, isLoading } = useQuery({
    queryKey: ['section-score', sectionKey],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userData) return null;

      // Get practice country
      const { data: practiceData } = await supabase
        .from('practices')
        .select('audit_country')
        .eq('id', userData.practice_id)
        .single();

      // Get current score
      const { data: score } = await supabase
        .from('score_current')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .eq('section_key', sectionKey)
        .maybeSingle();

      // Get target
      const { data: target } = await supabase
        .from('practice_targets')
        .select('target_score')
        .eq('practice_id', userData.practice_id)
        .eq('section_key', sectionKey)
        .maybeSingle();

      return { 
        score, 
        target,
        country: practiceData?.audit_country || 'England'
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="animate-pulse h-8 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!scoreData?.score) {
    const country = scoreData?.country || 'England';
    const regulatoryBody = country === 'Wales' ? 'HIW' : country === 'Scotland' ? 'HIS' : 'CQC';
    
    return (
      <Card className="border-none shadow-sm bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{sectionLabel} Readiness</p>
              <p className="text-xs text-muted-foreground">Not yet calculated • {regulatoryBody}</p>
            </div>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { score, target, country } = scoreData;
  const regulatoryBody = country === 'Wales' ? 'HIW' : country === 'Scotland' ? 'HIS' : 'CQC';
  const meetsTarget = target ? score.score >= target.target_score : false;

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{sectionLabel} Readiness</p>
              <Badge variant="outline" className="text-xs">{regulatoryBody}</Badge>
            </div>
            {target && (
              <p className="text-xs text-muted-foreground">Target: {target.target_score}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={RAGBadgeVariant(score.score)} className="text-base px-3 py-1">
              {score.score}
            </Badge>
            {meetsTarget && <CheckCircle2 className="h-5 w-5 text-green-500" />}
          </div>
        </div>

        <Progress value={score.score} className="h-2" />

        {/* Contributors breakdown */}
        {score.contributors_json && typeof score.contributors_json === 'object' && !Array.isArray(score.contributors_json) && Object.keys(score.contributors_json).length > 0 && (
          <div className="grid grid-cols-4 gap-2 text-xs pt-2 border-t">
            {typeof score.contributors_json === 'object' && 'C' in score.contributors_json && (
              <div>
                <span className="text-muted-foreground">Coverage:</span>{" "}
                <span className="font-medium">{Math.round(Number(score.contributors_json.C))}%</span>
              </div>
            )}
            {typeof score.contributors_json === 'object' && 'S' in score.contributors_json && (
              <div>
                <span className="text-muted-foreground">On-time:</span>{" "}
                <span className="font-medium">{Math.round(Number(score.contributors_json.S))}%</span>
              </div>
            )}
            {typeof score.contributors_json === 'object' && 'E' in score.contributors_json && (
              <div>
                <span className="text-muted-foreground">Evidence:</span>{" "}
                <span className="font-medium">{Math.round(Number(score.contributors_json.E))}%</span>
              </div>
            )}
            {typeof score.contributors_json === 'object' && 'R' in score.contributors_json && (
              <div>
                <span className="text-muted-foreground">Sign-off:</span>{" "}
                <span className="font-medium">{Math.round(Number(score.contributors_json.R))}%</span>
              </div>
            )}
          </div>
        )}

        {/* Active gates */}
        {score.gates_json && typeof score.gates_json === 'object' && !Array.isArray(score.gates_json) && 'active' in score.gates_json && Array.isArray(score.gates_json.active) && score.gates_json.active.length > 0 && (
          <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
            <AlertCircle className="h-3 w-3 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Active Gates:</p>
              <ul className="text-muted-foreground space-y-0.5">
                {typeof score.gates_json === 'object' && 'reasons' in score.gates_json && Array.isArray(score.gates_json.reasons) && score.gates_json.reasons.map((reason, i) => (
                  <li key={i}>• {String(reason)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
