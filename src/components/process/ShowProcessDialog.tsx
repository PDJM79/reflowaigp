import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ArrowLeft,
  Download,
  RefreshCw,
  Copy,
  Clock,
  User,
  Sparkles,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProcessDiagram } from '@/hooks/useProcessDiagram';
import { ProcessFlowChart } from './ProcessFlowChart';
import { exportProcessDiagramToPDF } from '@/lib/processDiagramPdf';
import { toast } from 'sonner';

interface ProcessTemplate {
  id: string;
  name: string;
  frequency: string | null;
  responsible_role: string | null;
}

interface ShowProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
  practiceName?: string;
}

type DialogStep = 'select' | 'view';

export function ShowProcessDialog({ 
  open, 
  onOpenChange, 
  practiceId,
  practiceName 
}: ShowProcessDialogProps) {
  const [step, setStep] = useState<DialogStep>('select');
  const [processes, setProcesses] = useState<ProcessTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<ProcessTemplate | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { diagram, loading: diagramLoading, error, generateDiagram, clearDiagram } = useProcessDiagram();

  // Fetch processes when dialog opens
  useEffect(() => {
    if (open && practiceId) {
      fetchProcesses();
    }
  }, [open, practiceId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedProcess(null);
      setSearchQuery('');
      clearDiagram();
    }
  }, [open, clearDiagram]);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('process_templates')
        .select('id, name, frequency, responsible_role')
        .eq('practice_id', practiceId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setProcesses(data || []);
    } catch (err) {
      console.error('Error fetching processes:', err);
      toast.error('Failed to load processes');
    } finally {
      setLoading(false);
    }
  };

  const filteredProcesses = useMemo(() => {
    if (!searchQuery) return processes;
    const query = searchQuery.toLowerCase();
    return processes.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.responsible_role?.toLowerCase().includes(query)
    );
  }, [processes, searchQuery]);

  const handleSelectProcess = async (process: ProcessTemplate) => {
    setSelectedProcess(process);
    setStep('view');
    await generateDiagram(process.id);
  };

  const handleBack = () => {
    setStep('select');
    setSelectedProcess(null);
    clearDiagram();
  };

  const handleRegenerate = async () => {
    if (selectedProcess) {
      await generateDiagram(selectedProcess.id, true);
    }
  };

  const handleCopyMermaid = () => {
    if (diagram?.mermaid_text) {
      navigator.clipboard.writeText(diagram.mermaid_text);
      toast.success('Mermaid code copied to clipboard');
    }
  };

  const handleDownloadPdf = async () => {
    if (!diagram || !selectedProcess) return;
    
    setExportingPdf(true);
    try {
      await exportProcessDiagramToPDF({
        processName: selectedProcess.name,
        frequency: selectedProcess.frequency,
        responsibleRole: selectedProcess.responsible_role,
        practiceName: practiceName,
        mermaidText: diagram.mermaid_text,
        generatedAt: diagram.generated_at,
        isAiEnhanced: diagram.is_ai_enhanced,
      });
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'view' && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 mr-1"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'select' ? 'Select a Process' : selectedProcess?.name}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' 
              ? 'Choose a process to view its flowchart'
              : 'Visual representation of the process workflow'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search processes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Process list */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredProcesses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No processes match your search' : 'No processes found'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProcesses.map((process) => (
                    <button
                      key={process.id}
                      onClick={() => handleSelectProcess(process)}
                      className="w-full p-4 rounded-lg border hover:bg-accent/50 transition-colors text-left flex items-center justify-between group"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{process.name}</div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {process.frequency && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {process.frequency}
                            </span>
                          )}
                          {process.responsible_role && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {process.responsible_role}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedProcess?.frequency && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {selectedProcess.frequency}
                </Badge>
              )}
              {selectedProcess?.responsible_role && (
                <Badge variant="outline" className="gap-1">
                  <User className="h-3 w-3" />
                  {selectedProcess.responsible_role}
                </Badge>
              )}
              {diagram?.is_ai_enhanced && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Enhanced
                </Badge>
              )}
            </div>

            <Separator />

            {/* Diagram */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {diagramLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Generating flowchart...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  {error}
                </div>
              ) : diagram ? (
                <div id="process-diagram-container">
                  <ProcessFlowChart 
                    mermaidText={diagram.mermaid_text} 
                    className="min-h-[400px]"
                  />
                </div>
              ) : null}
            </ScrollArea>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={handleDownloadPdf}
                disabled={!diagram || exportingPdf}
              >
                {exportingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download PDF
              </Button>
              <Button 
                variant="outline"
                onClick={handleRegenerate}
                disabled={diagramLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${diagramLoading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button 
                variant="outline"
                onClick={handleCopyMermaid}
                disabled={!diagram}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Mermaid
              </Button>

              {diagram?.generated_at && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Generated: {new Date(diagram.generated_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
