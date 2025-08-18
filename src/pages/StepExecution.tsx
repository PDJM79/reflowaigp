import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, ArrowRight, CheckCircle, Upload, Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/evidence/CameraCapture';
import { FileUpload } from '@/components/evidence/FileUpload';
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
  const { toast: useToastHook } = useToast();
  const [stepInstance, setStepInstance] = useState<StepInstance | null>(null);
  const [processTemplate, setProcessTemplate] = useState<ProcessTemplate | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);

  const currentStepIndex = parseInt(stepIndex || '0');

  useEffect(() => {
    if (!taskId || !user) return;

    const fetchStepData = async () => {
      try {
        // Fetch process template first
        const { data: processInstance } = await supabase
          .from('process_instances')
          .select('template_id')
          .eq('id', taskId)
          .single();

        if (processInstance) {
          const { data: template } = await supabase
            .from('process_templates')
            .select('*')
            .eq('id', processInstance.template_id)
            .single();

          setProcessTemplate(template);

          // Fetch step instance
          const { data: step } = await supabase
            .from('step_instances')
            .select('*')
            .eq('process_instance_id', taskId)
            .eq('step_index', currentStepIndex)
            .single();

          if (step) {
            setStepInstance(step);
            setNotes(step.notes || '');
            
            // Fetch evidence for this step
            const { data: evidenceData } = await supabase
              .from('evidence')
              .select('*')
              .eq('step_instance_id', step.id)
              .order('created_at', { ascending: false });
            
            setEvidence(evidenceData || []);
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

    setSubmitting(true);
    try {
      // Update step instance
      await supabase
        .from('step_instances')
        .update({
          status: 'complete' as const,
          notes,
          server_timestamp: new Date().toISOString()
        })
        .eq('id', stepInstance.id);

      useToastHook({
        title: "Step Completed",
        description: "Your progress has been saved successfully.",
      });

      // Check if this is the last step
      const stepsArray = Array.isArray(processTemplate?.steps) ? processTemplate.steps : [];
      const totalSteps = stepsArray.length;
      if (currentStepIndex + 1 >= totalSteps) {
        // Complete the entire process
        await supabase
          .from('process_instances')
          .update({
            status: 'complete' as const,
            completed_at: new Date().toISOString()
          })
          .eq('id', taskId);

        useToastHook({
          title: "Process Completed",
          description: "Congratulations! You have completed the entire process.",
        });

        navigate(`/task/${taskId}`);
      } else {
        // Navigate to next step
        navigate(`/task/${taskId}/step/${currentStepIndex + 1}`);
      }
    } catch (error) {
      console.error('Error completing step:', error);
      useToastHook({
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
      await supabase
        .from('step_instances')
        .update({
          status: 'pending' as const,
          notes,
          server_timestamp: new Date().toISOString()
        })
        .eq('id', stepInstance.id);

      useToastHook({
        title: "Draft Saved",
        description: "Your progress has been saved as a draft.",
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      useToastHook({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePhotoCapture = async (blob: Blob) => {
    if (!stepInstance || !user) return;

    try {
      // Get user ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) {
        toast.error('User not found');
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `evidence/${stepInstance.id}/${timestamp}_photo.jpg`;

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

      // Save evidence record to database
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('evidence')
        .insert({
          step_instance_id: stepInstance.id,
          user_id: userData.id,
          type: 'photo',
          storage_path: filename,
          mime_type: 'image/jpeg'
        })
        .select()
        .single();

      if (evidenceError) {
        console.error('Evidence error:', evidenceError);
        toast.error('Failed to save evidence record');
        return;
      }

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
      // Get user ID from users table
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) {
        toast.error('User not found');
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'bin';
      const filename = `evidence/${stepInstance.id}/${timestamp}_${file.name}`;

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

      // Save evidence record to database
      const { data: evidenceData, error: evidenceError } = await supabase
        .from('evidence')
        .insert({
          step_instance_id: stepInstance.id,
          user_id: userData.id,
          type: 'note', // Use 'note' for file uploads since we only have photo/note/signature
          storage_path: filename,
          mime_type: file.type
        })
        .select()
        .single();

      if (evidenceError) {
        console.error('Evidence error:', evidenceError);
        toast.error('Failed to save evidence record');
        return;
      }

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

      // Delete from database
      const { error: dbError } = await supabase
        .from('evidence')
        .delete()
        .eq('id', evidenceId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
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
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!stepInstance || !processTemplate) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
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

  const stepsArray = Array.isArray(processTemplate.steps) ? processTemplate.steps : [];
  const currentStep = stepsArray[currentStepIndex];
  const totalSteps = stepsArray.length;
  const isLastStep = currentStepIndex + 1 >= totalSteps;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
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
                <CardTitle className="flex items-center gap-2">
                  Step {currentStepIndex + 1}: {stepInstance.title}
                  {stepInstance.status === 'completed' && (
                    <CheckCircle className="h-5 w-5 text-success" />
                  )}
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
                      disabled={submitting}
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

      {/* Camera and File Upload Dialogs */}
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
    </div>
  );
}