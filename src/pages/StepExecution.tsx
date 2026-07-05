import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle, Upload, Camera, X, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/evidence/CameraCapture';
import { FileUpload } from '@/components/evidence/FileUpload';
import { StepHelpChat } from '@/components/help/StepHelpChat';
import { toast } from 'sonner';

interface StepInstance {
  id: string;
  process_instance_id: string;
  step_index: number;
  title: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface ProcessTemplate {
  id: string;
  name: string;
  steps: any;
}

interface Evidence {
  id: string;
  type: 'photo' | 'note' | 'signature';
  storage_path: string;
  mime_type?: string;
  created_at: string;
}

export default function StepExecution() {
  const { taskId, stepIndex } = useParams<{ taskId: string; stepIndex: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [stepInstance, setStepInstance] = useState<StepInstance | null>(null);
  const [processTemplate, setProcessTemplate] = useState<ProcessTemplate | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);

  const currentStepIndex = parseInt(stepIndex || '0');

  useEffect(() => {
    if (!taskId || !user) return;

    const fetchStepData = async () => {
      try {
        const pid = user.practiceId;
        // Fetch process instance (for its template id) then the template
        const piRes = await fetch(`/api/practices/${pid}/process-instances/${taskId}`, { credentials: 'include' });
        const processInstance = piRes.ok ? await piRes.json() : null;

        if (processInstance) {
          const templateId = processInstance.templateId ?? processInstance.template_id;
          const tplRes = await fetch(`/api/practices/${pid}/process-templates/${templateId}`, { credentials: 'include' });
          const template = tplRes.ok ? await tplRes.json() : null;

          setProcessTemplate(template);

          // Fetch step instances for this process instance
          const stepsRes = await fetch(`/api/practices/${pid}/process-instances/${taskId}/step-instances`, { credentials: 'include' });
          const allSteps = stepsRes.ok ? await stepsRes.json() as any[] : [];
          const step = allSteps.find((s) => s.step_index === currentStepIndex);

          if (step) {
            setStepInstance(step);
            setNotes(step.notes || '');

            // Fetch evidence for this step
            const evRes = await fetch(`/api/practices/${pid}/step-instances/${step.id}/evidence`, { credentials: 'include' });
            setEvidence(evRes.ok ? await evRes.json() : []);
          } else if (template) {
            // No step instances exist yet - create them automatically
            let stepsArray: any[] = [];
            if (template.steps) {
              if (Array.isArray(template.steps)) {
                stepsArray = template.steps;
              } else if (typeof template.steps === 'object' && template.steps !== null) {
                const stepsObj = template.steps as any;
                if (Array.isArray(stepsObj)) {
                  stepsArray = stepsObj;
                } else {
                  stepsArray = Object.values(stepsObj).filter(step =>
                    step && typeof step === 'object' && (step as any).title
                  );
                }
              }
            }

            if (Array.isArray(stepsArray) && stepsArray.length > 0) {
              const stepsToCreate = stepsArray.map((step: any, index: number) => ({
                stepIndex: index,
                title: step.title || step.description || `Step ${index + 1}`,
                status: 'pending' as const,
              }));

              const createRes = await fetch(`/api/practices/${pid}/process-instances/${taskId}/step-instances`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steps: stepsToCreate }),
              });
              if (!createRes.ok) {
                console.error('Error creating step instances:', createRes.status);
              } else {
                const createdSteps = await createRes.json() as any[];
                if (createdSteps[currentStepIndex]) {
                  setStepInstance(createdSteps[currentStepIndex]);
                  setNotes('');
                  // Also update the process to started
                  await fetch(`/api/practices/${pid}/process-instances/${taskId}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'in_progress', startedAt: new Date().toISOString() }),
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching step data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStepData();
  }, [taskId, currentStepIndex, user]);

  const handleCompleteStep = async () => {
    if (!stepInstance) return;

    if (!isConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that this step is as expected before completing.",
        variant: "destructive"
      });
      return;
    }

    // Capture step ID before any async operations to prevent race conditions
    const stepIdToComplete = stepInstance.id;
    const stepIndexToComplete = currentStepIndex;

    setSubmitting(true);
    try {
      // Update step instance and verify the update succeeded
      const updateRes = await fetch(`/api/practices/${user!.practiceId}/step-instances/${stepIdToComplete}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete', notes, serverTimestamp: new Date().toISOString() }),
      });
      if (!updateRes.ok) {
        console.error('Error updating step:', updateRes.status);
        throw new Error('Failed to update step status');
      }
      const updatedStep = await updateRes.json();

      // Verify the update was actually applied
      if (updatedStep?.status !== 'complete') {
        console.error('Step status not updated correctly:', updatedStep);
        throw new Error('Step status verification failed');
      }

      toast({
        title: "Step Completed",
        description: "Your progress has been saved successfully.",
      });

      // Check if this is the last step - use same parsing logic
      let stepCount = 0;
      if (processTemplate?.steps) {
        if (Array.isArray(processTemplate.steps)) {
          stepCount = processTemplate.steps.length;
        } else if (typeof processTemplate.steps === 'object') {
          stepCount = Array.isArray(processTemplate.steps) ? processTemplate.steps.length : 0;
        }
      }
      
      if (stepIndexToComplete + 1 >= stepCount) {
        // Complete the entire process
        const processRes = await fetch(`/api/practices/${user!.practiceId}/process-instances/${taskId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'complete', completedAt: new Date().toISOString() }),
        });
        if (!processRes.ok) {
          console.error('Error completing process:', processRes.status);
        }

        toast({
          title: "Process Completed",
          description: "Congratulations! You have completed the entire process.",
        });

        navigate(`/task/${taskId}`);
      } else {
        // Navigate to next step
        navigate(`/task/${taskId}/step/${stepIndexToComplete + 1}`);
      }
    } catch (error) {
      console.error('Error completing step:', error);
      toast({
        title: "Error",
        description: "Failed to complete step. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!stepInstance) return;

    try {
      await fetch(`/api/practices/${user!.practiceId}/step-instances/${stepInstance.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', notes, serverTimestamp: new Date().toISOString() }),
      });

      toast({
        title: "Draft Saved",
        description: "Your progress has been saved as a draft.",
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePhotoCapture = async (blob: Blob) => {
    if (!stepInstance || !user) return;

    try {
      // Generate unique filename with practice_id prefix
      const timestamp = Date.now();
      const filename = `${user.practiceId}/${stepInstance.id}/${timestamp}_photo.jpg`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload photo');
        return;
      }

      // Save evidence record to database via the API
      const evRes = await fetch(`/api/practices/${user.practiceId}/step-instances/${stepInstance.id}/evidence`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'photo', storagePath: filename, mimeType: 'image/jpeg', userId: user.id }),
      });
      if (!evRes.ok) {
        console.error('Evidence error:', evRes.status);
        toast.error('Failed to save evidence record');
        return;
      }
      const evidenceData = await evRes.json();

      // Update evidence list
      setEvidence(prev => [evidenceData, ...prev]);
      toast.success('Photo captured and saved successfully');

    } catch (error) {
      console.error('Error capturing photo:', error);
      toast.error('Failed to capture photo');
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!stepInstance || !user) return;

    try {
      // Generate unique filename with practice_id prefix
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'bin';
      const filename = `${user.practiceId}/${stepInstance.id}/${timestamp}_${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload file');
        return;
      }

      // Save evidence record to database via the API
      const evRes = await fetch(`/api/practices/${user.practiceId}/step-instances/${stepInstance.id}/evidence`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', storagePath: filename, mimeType: file.type, userId: user.id }),
      });
      if (!evRes.ok) {
        console.error('Evidence error:', evRes.status);
        toast.error('Failed to save evidence record');
        return;
      }
      const evidenceData = await evRes.json();

      // Update evidence list
      setEvidence(prev => [evidenceData, ...prev]);
      toast.success('File uploaded successfully');

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }
  };

  const deleteEvidence = async (evidenceId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('evidence')
        .remove([storagePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database via the API
      const delRes = await fetch(`/api/practices/${user!.practiceId}/evidence/${evidenceId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!delRes.ok) {
        console.error('Database deletion error:', delRes.status);
        toast.error('Failed to delete evidence');
        return;
      }

      // Update evidence list
      setEvidence(prev => prev.filter(e => e.id !== evidenceId));
      toast.success('Evidence deleted successfully');

    } catch (error) {
      console.error('Error deleting evidence:', error);
      toast.error('Failed to delete evidence');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!stepInstance || !processTemplate) {
    return (
      <div className="p-4 md:p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Step Not Found</h1>
            <Button onClick={() => navigate(`/task/${taskId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Task
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Parse steps from template - handle both array and JSON string formats
  let stepsArray = [];
  if (processTemplate.steps) {
    if (Array.isArray(processTemplate.steps)) {
      stepsArray = processTemplate.steps;
    } else if (typeof processTemplate.steps === 'string') {
      try {
        stepsArray = JSON.parse(processTemplate.steps);
      } catch (e) {
        console.error('Error parsing steps JSON:', e);
        stepsArray = [];
      }
    } else if (typeof processTemplate.steps === 'object') {
      // Handle object format from database
      stepsArray = processTemplate.steps;
    }
  }
  
  
  const currentStep = Array.isArray(stepsArray) && stepsArray.length > currentStepIndex ? stepsArray[currentStepIndex] : null;
  const totalSteps = Array.isArray(stepsArray) ? stepsArray.length : 0;
  const isLastStep = currentStepIndex + 1 >= totalSteps;

  return (
    <div className="p-4 md:p-6">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate(`/task/${taskId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Task
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{processTemplate.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline">
                Step {currentStepIndex + 1} of {totalSteps}
              </Badge>
              <span>•</span>
              <span>{stepInstance.title}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    Step {currentStepIndex + 1}: {stepInstance.title}
                    {stepInstance.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-success" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHelpChat(true)}
                    className="flex items-center gap-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Ask for help
                  </Button>
                </CardTitle>
                <CardDescription>
                  {currentStep?.description || 'Complete this step to proceed with the process'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step Instructions */}
                {currentStep?.instructions && (
                  <div>
                    <h3 className="font-medium mb-2">Instructions</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">{currentStep.instructions}</p>
                    </div>
                  </div>
                )}

                {/* Evidence Collection */}
                <div>
                  <h3 className="font-medium mb-2">Evidence Collection</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => setShowCamera(true)}
                    >
                      <Camera className="h-6 w-6" />
                      Take Photo
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col gap-2"
                      onClick={() => setShowFileUpload(true)}
                    >
                      <Upload className="h-6 w-6" />
                      Upload File
                    </Button>
                  </div>

                  {/* Evidence List */}
                  {evidence.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium">Collected Evidence</h4>
                      {evidence.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2 bg-muted rounded border"
                        >
                          <div className="flex items-center gap-2">
                            {item.type === 'photo' ? (
                              <Camera className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Upload className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm">
                              {item.type === 'photo' ? 'Photo' : 'File'} - {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEvidence(item.id, item.storage_path)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmation Section */}
                <div className="border-t pt-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="step-confirmation"
                      checked={isConfirmed}
                      onCheckedChange={(checked) => setIsConfirmed(checked as boolean)}
                      className="mt-1"
                    />
                    <label
                      htmlFor="step-confirmation"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I confirm I am happy that this step of this process is as expected
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="font-medium mb-2">Notes & Comments</h3>
                  <Textarea
                    placeholder="Add any notes, observations, or comments about this step..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleSaveDraft}>
                    Save Draft
                  </Button>
                  <div className="flex gap-2">
                    {currentStepIndex > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/task/${taskId}/step/${currentStepIndex - 1}`)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    )}
                    <Button 
                      onClick={handleCompleteStep}
                      disabled={submitting || !isConfirmed}
                      className={!isConfirmed ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      {submitting ? 'Completing...' : (
                        <>
                          {isLastStep ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete Process
                            </>
                          ) : (
                            <>
                              Next Step
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Step Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stepsArray.map((step: any, index: number) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 p-2 rounded ${
                        index === currentStepIndex ? 'bg-accent' : ''
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        index < currentStepIndex ? 'bg-success text-success-foreground' :
                        index === currentStepIndex ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index < currentStepIndex ? '✓' : index + 1}
                      </div>
                      <span className={`text-sm ${
                        index === currentStepIndex ? 'font-medium' : ''
                      }`}>
                        {step.title || `Step ${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Take clear photos of any evidence</li>
                  <li>• Add detailed notes for future reference</li>
                  <li>• Save draft if you need to come back later</li>
                  <li>• Ensure all requirements are met before completing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Camera, File Upload, and Help Chat Dialogs */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handlePhotoCapture}
        title="Take Photo Evidence"
      />
      
      <FileUpload
        isOpen={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUpload={handleFileUpload}
        title="Upload File Evidence"
      />

      <StepHelpChat
        isOpen={showHelpChat}
        onClose={() => setShowHelpChat(false)}
        stepTitle={stepInstance?.title || 'Current Step'}
        stepDescription={currentStep?.description}
        processName={processTemplate?.name || 'Current Process'}
      />
    </div>
  );
}