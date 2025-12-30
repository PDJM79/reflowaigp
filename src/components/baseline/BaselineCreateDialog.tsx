import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  CalendarIcon, 
  Upload, 
  Loader2, 
  FileText, 
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface BaselineCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
  onCreated: () => void;
  existingBaselines?: any[];
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
}

export function BaselineCreateDialog({
  open,
  onOpenChange,
  practiceId,
  onCreated,
  existingBaselines = [],
}: BaselineCreateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [baselineName, setBaselineName] = useState('');
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 12));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [rebaselineReason, setRebaselineReason] = useState('');
  const [replacesBaselineId, setReplacesBaselineId] = useState<string>('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isRebaseline = !!replacesBaselineId;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const docId = crypto.randomUUID();
      const newDoc: UploadedDocument = {
        id: docId,
        name: file.name,
        type: file.type,
        size: file.size,
        status: 'uploading',
      };

      setUploadedDocs(prev => [...prev, newDoc]);

      try {
        // Generate hash for the file
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Upload to storage
        const storagePath = `${practiceId}/${docId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('baseline-documents')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Create document record
        const { error: insertError } = await supabase
          .from('baseline_documents')
          .insert({
            id: docId,
            practice_id: practiceId,
            file_name: file.name,
            file_type: file.type,
            storage_path: storagePath,
            file_hash: hashHex,
            file_size_bytes: file.size,
            uploaded_by: user?.id,
          });

        if (insertError) throw insertError;

        setUploadedDocs(prev => 
          prev.map(d => d.id === docId ? { ...d, status: 'uploaded' as const } : d)
        );
      } catch (error: any) {
        console.error('Upload error:', error);
        setUploadedDocs(prev => 
          prev.map(d => d.id === docId ? { ...d, status: 'failed' as const } : d)
        );
        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const removeDocument = async (docId: string) => {
    const doc = uploadedDocs.find(d => d.id === docId);
    if (!doc) return;

    try {
      // Delete from storage and database
      await supabase.from('baseline_documents').delete().eq('id', docId);
    } catch (error) {
      console.error('Error removing document:', error);
    }

    setUploadedDocs(prev => prev.filter(d => d.id !== docId));
  };

  const handleCreate = async () => {
    if (!baselineName.trim()) {
      toast({ title: 'Please enter a baseline name', variant: 'destructive' });
      return;
    }

    if (isRebaseline && !rebaselineReason.trim()) {
      toast({ title: 'Please provide a reason for rebaselining', variant: 'destructive' });
      return;
    }

    setCreating(true);

    try {
      // Process uploaded documents if any
      const completedDocs = uploadedDocs.filter(d => d.status === 'uploaded');
      if (completedDocs.length > 0) {
        await supabase.functions.invoke('process-baseline-documents', {
          body: { documentIds: completedDocs.map(d => d.id) },
        });
      }

      // Create baseline
      const { data, error } = await supabase.functions.invoke('create-baseline', {
        body: {
          practiceId,
          baselineName: baselineName.trim(),
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          documentIds: completedDocs.map(d => d.id),
          rebaselineReason: isRebaseline ? rebaselineReason : undefined,
          replacesBaselineId: isRebaseline ? replacesBaselineId : undefined,
        },
      });

      if (error) throw error;

      toast({ title: 'Baseline created successfully' });
      
      // Reset form
      setBaselineName('');
      setRebaselineReason('');
      setReplacesBaselineId('');
      setUploadedDocs([]);
      
      onCreated();
    } catch (error: any) {
      console.error('Error creating baseline:', error);
      toast({
        title: 'Failed to create baseline',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRebaseline ? 'Create New Baseline (Rebaseline)' : 'Create Baseline Snapshot'}
          </DialogTitle>
          <DialogDescription>
            {isRebaseline 
              ? 'Create a new baseline snapshot that replaces an existing one.'
              : 'Capture a baseline of your compliance scores from a historical period.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Baseline Name */}
          <div className="space-y-2">
            <Label htmlFor="baseline-name">Baseline Name</Label>
            <Input
              id="baseline-name"
              placeholder="e.g., Q4 2024 Baseline"
              value={baselineName}
              onChange={e => setBaselineName(e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={date => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={date => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Rebaseline Option */}
          {existingBaselines.length > 0 && (
            <div className="space-y-2">
              <Label>Replace Existing Baseline (Optional)</Label>
              <Select value={replacesBaselineId} onValueChange={setReplacesBaselineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select baseline to replace..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (new baseline)</SelectItem>
                  {existingBaselines.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.baseline_name} ({format(new Date(b.start_date), 'MMM yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rebaseline Reason */}
          {isRebaseline && (
            <div className="space-y-2">
              <Label htmlFor="rebaseline-reason">
                Reason for Rebaseline <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rebaseline-reason"
                placeholder="Explain why you are creating a new baseline..."
                value={rebaselineReason}
                onChange={e => setRebaselineReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Document Upload */}
          <div className="space-y-2">
            <Label>Upload Historical Documents (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Upload paper records, audit reports, or logs to enhance baseline accuracy.
            </p>
            <Card className="p-4 border-dashed">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Click to upload PDF, Excel, CSV, or images'}
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </Card>

            {/* Uploaded Documents List */}
            {uploadedDocs.length > 0 && (
              <div className="space-y-2 mt-3">
                {uploadedDocs.map(doc => (
                  <div 
                    key={doc.id} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border",
                      doc.status === 'failed' && "border-destructive bg-destructive/10"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {doc.status === 'uploaded' && (
                        <Badge variant="secondary" className="text-xs">Ready</Badge>
                      )}
                      {doc.status === 'failed' && (
                        <Badge variant="destructive" className="text-xs">Failed</Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning for low confidence */}
          {uploadedDocs.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                Without uploaded documents, the baseline will be computed from existing digital audit data only.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || uploading}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Baseline'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
