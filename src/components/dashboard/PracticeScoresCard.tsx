import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function PracticeScoresCard() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Practice Scores
          </CardTitle>
          <CardDescription>Compliance & Fit for Audit metrics</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          No audit scores available yet.
        </div>
      </CardContent>
    </Card>
  );
}
