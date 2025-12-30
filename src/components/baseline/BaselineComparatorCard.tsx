import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  RefreshCw, 
  Plus, 
  History,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BaselineCreateDialog } from './BaselineCreateDialog';
import { format } from 'date-fns';

interface BaselineSnapshot {
  id: string;
  baseline_name: string;
  start_date: string;
  end_date: string;
  compliance_score: number;
  fit_for_audit_score: number;
  driver_details: any[];
  red_flags: any[];
  created_at: string;
  created_by: string;
  status: string;
}

interface DeltaResult {
  baseline_id: string;
  baseline: {
    start: string;
    end: string;
    compliance_score: number;
    fit_for_audit_score: number;
  };
  current: {
    start: string;
    end: string;
    compliance_score: number;
    fit_for_audit_score: number;
  };
  delta: {
    compliance_absolute: number;
    compliance_percent: number;
    fit_for_audit_absolute: number;
    fit_for_audit_percent: number;
  };
  drivers: Array<{
    check_type: string;
    impact: number;
    reason: string;
    baseline_score: number;
    current_score: number;
  }>;
  narrative: string;
}

interface BaselineComparatorCardProps {
  practiceId: string;
}

export function BaselineComparatorCard({ practiceId }: BaselineComparatorCardProps) {
  const { user } = useAuth();
  const { hasCapability } = useCapabilities();
  const { toast } = useToast();
  
  const [baselines, setBaselines] = useState<BaselineSnapshot[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>('');
  const [deltaResult, setDeltaResult] = useState<DeltaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [computingDelta, setComputingDelta] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [comparisonWindow, setComparisonWindow] = useState('90');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isAdmin = hasCapability('manage_staff' as any);

  useEffect(() => {
    fetchBaselines();
  }, [practiceId]);

  useEffect(() => {
    if (selectedBaselineId) {
      computeDelta();
    }
  }, [selectedBaselineId, comparisonWindow]);

  const fetchBaselines = async () => {
    try {
      const { data, error } = await supabase
        .from('baseline_snapshots')
        .select('*')
        .eq('practice_id', practiceId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map((b: any) => ({
        ...b,
        driver_details: Array.isArray(b.driver_details) ? b.driver_details : [],
        red_flags: Array.isArray(b.red_flags) ? b.red_flags : [],
      }));

      setBaselines(mappedData);
      if (mappedData.length > 0 && !selectedBaselineId) {
        setSelectedBaselineId(mappedData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching baselines:', error);
    } finally {
      setLoading(false);
    }
  };

  const computeDelta = async () => {
    if (!selectedBaselineId) return;
    
    setComputingDelta(true);
    try {
      const { data, error } = await supabase.functions.invoke('compute-delta', {
        body: {
          practiceId,
          baselineId: selectedBaselineId,
          comparisonWindowDays: parseInt(comparisonWindow),
        },
      });

      if (error) throw error;
      setDeltaResult(data);
    } catch (error: any) {
      console.error('Error computing delta:', error);
      toast({
        title: 'Error computing delta',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setComputingDelta(false);
    }
  };

  const handleExportPdf = async () => {
    if (!deltaResult) return;
    
    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const baseline = baselines.find(b => b.id === selectedBaselineId);
    const exporter = new DashboardPDFExporter({
      title: 'Baseline & Delta Compliance Report',
      subtitle: `Baseline: ${baseline?.baseline_name || 'Unknown'}`,
      dateRange: {
        start: deltaResult.baseline.start,
        end: deltaResult.current.end,
      },
    });

    exporter.addSection('Executive Summary');
    exporter.addList([deltaResult.narrative]);

    exporter.addSection('Score Comparison');
    exporter.addMetricsGrid([
      { 
        label: 'Baseline Compliance',
        value: `${deltaResult.baseline.compliance_score}%`, 
        subtitle: `${deltaResult.baseline.start} – ${deltaResult.baseline.end}` 
      },
      { 
        label: 'Current Compliance', 
        value: `${deltaResult.current.compliance_score}%`, 
        subtitle: `${deltaResult.current.start} – ${deltaResult.current.end}` 
      },
      { 
        label: 'Change', 
        value: `${deltaResult.delta.compliance_absolute > 0 ? '+' : ''}${deltaResult.delta.compliance_absolute}%`, 
        subtitle: `${deltaResult.delta.compliance_percent > 0 ? '+' : ''}${deltaResult.delta.compliance_percent}% relative` 
      },
    ]);

    exporter.addSection('Fit for Audit');
    exporter.addMetricsGrid([
      { 
        label: 'Baseline', 
        value: `${deltaResult.baseline.fit_for_audit_score}%`, 
        subtitle: 'Fit for Audit Score' 
      },
      { 
        label: 'Current', 
        value: `${deltaResult.current.fit_for_audit_score}%`, 
        subtitle: 'Fit for Audit Score' 
      },
      { 
        label: 'Change', 
        value: `${deltaResult.delta.fit_for_audit_absolute > 0 ? '+' : ''}${deltaResult.delta.fit_for_audit_absolute}%`, 
        subtitle: `${deltaResult.delta.fit_for_audit_percent > 0 ? '+' : ''}${deltaResult.delta.fit_for_audit_percent}% relative` 
      },
    ]);

    if (deltaResult.drivers.length > 0) {
      exporter.addSection('Top Drivers of Change');
      exporter.addList(
        deltaResult.drivers.map(d => 
          `${d.check_type.replace(/_/g, ' ')}: ${d.impact > 0 ? '+' : ''}${d.impact} pts - ${d.reason}`
        )
      );
    }

    if (baseline?.red_flags && baseline.red_flags.length > 0) {
      exporter.addSection('Red Flags (Baseline)');
      exporter.addList(
        baseline.red_flags.map((f: any) => `[${f.severity.toUpperCase()}] ${f.description}`)
      );
    }

    exporter.save(generateFilename('baseline-delta-report', { 
      start: deltaResult.baseline.start, 
      end: deltaResult.current.end 
    }));

    toast({ title: 'PDF exported successfully' });
  };

  const handleBaselineCreated = () => {
    fetchBaselines();
    setCreateDialogOpen(false);
  };

  const getDeltaIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-success" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getDeltaColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatCheckType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (baselines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Baseline & Delta Comparator
          </CardTitle>
          <CardDescription>
            Create a baseline from historical data to track improvement
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">No baseline has been created yet.</p>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Baseline
            </Button>
          )}
        </CardContent>
        <BaselineCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          practiceId={practiceId}
          onCreated={handleBaselineCreated}
        />
      </Card>
    );
  }

  const selectedBaseline = baselines.find(b => b.id === selectedBaselineId);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Baseline & Delta Comparator
            </CardTitle>
            <CardDescription>Compare current performance against baseline</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedBaselineId} onValueChange={setSelectedBaselineId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select baseline" />
              </SelectTrigger>
              <SelectContent>
                {baselines.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.baseline_name} ({format(new Date(b.start_date), 'MMM yyyy')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={comparisonWindow} onValueChange={setComparisonWindow}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={computeDelta} disabled={computingDelta}>
              <RefreshCw className={`h-4 w-4 ${computingDelta ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Compact Score Tiles */}
        {deltaResult && (
          <div className="grid grid-cols-3 gap-4">
            {/* Baseline Score */}
            <div className="p-4 rounded-xl border bg-gradient-to-br from-muted/30 to-background text-center">
              <p className="text-xs font-medium text-muted-foreground mb-1">Baseline</p>
              <p className="text-3xl font-bold">{deltaResult.baseline.compliance_score}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(deltaResult.baseline.start), 'MMM d')} – {format(new Date(deltaResult.baseline.end), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Current Score */}
            <div className="p-4 rounded-xl border bg-gradient-to-br from-muted/30 to-background text-center">
              <p className="text-xs font-medium text-muted-foreground mb-1">Current</p>
              <p className="text-3xl font-bold">{deltaResult.current.compliance_score}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(deltaResult.current.start), 'MMM d')} – {format(new Date(deltaResult.current.end), 'MMM d, yyyy')}
              </p>
            </div>

            {/* Delta */}
            <div className={`p-4 rounded-xl border text-center ${
              deltaResult.delta.compliance_absolute > 0 
                ? 'bg-success/10 border-success/30' 
                : deltaResult.delta.compliance_absolute < 0 
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-muted/30'
            }`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Change</p>
              <div className="flex items-center justify-center gap-1">
                {getDeltaIcon(deltaResult.delta.compliance_absolute)}
                <p className={`text-3xl font-bold ${getDeltaColor(deltaResult.delta.compliance_absolute)}`}>
                  {deltaResult.delta.compliance_absolute > 0 ? '+' : ''}{deltaResult.delta.compliance_absolute}%
                </p>
              </div>
              <p className={`text-xs mt-1 ${getDeltaColor(deltaResult.delta.compliance_percent)}`}>
                {deltaResult.delta.compliance_percent > 0 ? '+' : ''}{deltaResult.delta.compliance_percent}% relative
              </p>
            </div>
          </div>
        )}

        {/* Narrative */}
        {deltaResult && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm">{deltaResult.narrative}</p>
          </div>
        )}

        {/* Red Flags */}
        {selectedBaseline?.red_flags && selectedBaseline.red_flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedBaseline.red_flags.slice(0, 3).map((flag: any, idx: number) => (
              <Badge 
                key={idx} 
                variant={flag.severity === 'high' ? 'destructive' : 'secondary'}
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {flag.type.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        )}

        {/* Expandable Drivers Section */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Top Drivers of Change</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            {deltaResult && deltaResult.drivers.length > 0 ? (
              <div className="space-y-3">
                {deltaResult.drivers.map((driver, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {driver.impact > 0 ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{formatCheckType(driver.check_type)}</p>
                        <p className="text-xs text-muted-foreground">{driver.reason}</p>
                      </div>
                    </div>
                    <Badge variant={driver.impact > 0 ? 'default' : 'secondary'} className={getDeltaColor(driver.impact)}>
                      {driver.impact > 0 ? '+' : ''}{driver.impact} pts
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No significant changes detected
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!deltaResult}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Baseline
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <BaselineCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        practiceId={practiceId}
        onCreated={handleBaselineCreated}
        existingBaselines={baselines}
      />
    </Card>
  );
}
