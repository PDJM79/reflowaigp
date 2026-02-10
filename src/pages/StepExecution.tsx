import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, ArrowRight, CheckCircle, Upload, Camera, X, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CameraCapture } from '@/components/evidence/CameraCapture';
import { FileUpload } from '@/components/evidence/FileUpload';
import { StepHelpChat } from '@/components/help/StepHelpChat';
import { toast } from 'sonner';

interface StepInstance {
  id: string;
  processInstanceId: string;
  stepIndex: number;
  title: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ProcessTemplate {
  id: string;
  name: string;
  steps: any;
}

interface Evidence {
  id: string;
  type: 'photo' | 'note' | 'signature';
  storagePath: string;
  mimeType?: string;
  createdAt: string;
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
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showHelpChat, setShowHelpChat] = useState(false);

  const currentStepIndex = parseInt(stepIndex || '0');

  useEffect(() => {
    if (!taskId || !user?.practiceId) return;
    setLoading(false);
  }, [taskId, currentStepIndex, user]);

  const handleCompleteStep = async () => {
    if (!stepInstance) return;

    if (!isConfirmed) {
      useToastHook({
        title: "Confirmation Required",
        description: "Please confirm that this step is as expected before completing.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      useToastHook({
        title: "Step Completed",
        description: "Your progress has been saved successfully.",
      });

      let stepCount = 0;
      if (processTemplate?.steps) {
        if (Array.isArray(processTemplate.steps)) {
          stepCount = processTemplate.steps.length;
        } else if (typeof processTemplate.steps === 'object') {
          stepCount = Object.keys(processTemplate.steps).length;
        }
      }
      
      if (currentStepIndex + 1 >= stepCount) {
        useToastHook({
          title: "Process Completed",
          description: "Congratulations! You have completed the entire process.",
        });
        navigate(`/task/${taskId}`);
      } else {
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
    toast.info('Photo capture is not yet connected to the backend');
  };

  const handleFileUpload = async (file: File) => {
    if (!stepInstance || !user) return;
    toast.info('File upload is not yet connected to the backend');
  };

  const deleteEvidence = async (evidenceId: string, storagePath: string) => {
    toast.info('Evidence deletion is not yet connected to the backend');
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
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Process Steps</h1>
            <p className="text-muted-foreground">
              Step-by-step process execution will be available soon.
            </p>
            <Button onClick={() => navigate(`/task/${taskId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Task
            </Button>
          </div>
        </div>
      </div>
    );
  }

  let stepsArray: any[] = [];
  if (processTemplate.steps) {
    if (Array.isArray(processTemplate.steps)) {
      stepsArray = processTemplate.steps;
    } else if (typeof processTemplate.steps === 'string') {
      try {
        stepsArray = JSON.parse(processTemplate.steps);
      } catch (e) {
        stepsArray = [];
      }
    } else if (typeof processTemplate.steps === 'object') {
      stepsArray = Object.values(processTemplate.steps).filter((s: any) => s && typeof s === 'object' && s.title);
    }
  }
  
  const currentStep = Array.isArray(stepsArray) && stepsArray.length > currentStepIndex ? stepsArray[currentStepIndex] : null;
  const totalSteps = Array.isArray(stepsArray) ? stepsArray.length : 0;
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
                {currentStep?.instructions && (
                  <div>
                    <h3 className="font-medium mb-2">Instructions</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm">{currentStep.instructions}</p>
                    </div>
                  </div>
                )}

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
                              {item.type === 'photo' ? 'Photo' : 'File'} - {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEvidence(item.id, item.storagePath)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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

                <div>
                  <h3 className="font-medium mb-2">Notes & Comments</h3>
                  <Textarea
                    placeholder="Add any notes, observations, or comments about this step..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

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