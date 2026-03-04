// ── Onboarding Wizard Orchestrator ────────────────────────────────────────────
// Manages step routing and accumulated wizard state. All persistence is
// delegated to each step component — this file only decides which to render.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardLayout }      from './onboarding/WizardLayout';
import { Step1Practice }     from './onboarding/Step1Practice';
import { Step2Modules }      from './onboarding/Step2Modules';
import { Step3Inspection }   from './onboarding/Step3Inspection';
import { Step4Compliance }   from './onboarding/Step4Compliance';
import { Step5Rooms }        from './onboarding/Step5Rooms';
import { Step6Cleaning }     from './onboarding/Step6Cleaning';
import { Step7Review }       from './onboarding/Step7Review';
import { getStepConfig }     from './onboarding/types';
import type { InspectionData, ModuleSelections, WizardState, Room } from './onboarding/types';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

export default function Onboarding() {
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const [step, setStep]           = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [done, setDone]           = useState(false);
  const [newPracticeId, setNewPracticeId] = useState<string | null>(null);
  const [state, setState]         = useState<WizardState>({
    regulator: 'cqc', inspectionData: null, modules: {}, rooms: [],
  });

  const stepConfig = getStepConfig(state.modules);
  const cleaningOn = state.modules['cleaning'] !== false;

  // Auto-redirect 3 seconds after completion — to register form for the new practice
  useEffect(() => {
    if (!done || !newPracticeId) return;
    const t = setTimeout(() => navigate(`/login?register=1&pid=${newPracticeId}`), 3000);
    return () => clearTimeout(t);
  }, [done, newPracticeId, navigate]);

  // ── Step completion callbacks ──────────────────────────────────────────────

  const onStep1Complete = (sid: string, inspection: InspectionData | null, regulator: 'cqc' | 'hiw') => {
    setSessionId(sid);
    setState(prev => ({ ...prev, regulator, inspectionData: inspection }));
    setStep(2);
  };

  const onStep2Complete = (modules: ModuleSelections) => {
    setState(prev => ({ ...prev, modules }));
    setStep(3);
  };

  const onStep3Complete = (inspection: InspectionData) => {
    setState(prev => ({ ...prev, inspectionData: inspection }));
    setStep(4);
  };

  const onStep4Complete = () => setStep(cleaningOn ? 5 : 7);

  const onStep5Complete = (rooms: Room[]) => {
    setState(prev => ({ ...prev, rooms }));
    setStep(6);
  };

  const onStep6Complete = () => setStep(7);

  // ── Back navigation ────────────────────────────────────────────────────────
  const backFromStep7 = () => setStep(cleaningOn ? 6 : 4);

  // ── Wizard completion: calls /api/onboarding/complete ─────────────────────
  const handleComplete = async () => {
    if (!sessionId) return;
    setCompleting(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Completion failed (${res.status})`);
      setNewPracticeId(d.practiceId ?? null);
      setDone(true);
    } catch (err: any) {
      toast({ title: 'Could not complete setup', description: err.message, variant: 'destructive' });
    } finally {
      setCompleting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <WizardLayout step={stepConfig.total} totalSteps={stepConfig.total} stepLabels={stepConfig.labels}>
        <div className="rounded-lg border bg-background p-12 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Welcome to FitForAudit GP!</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your practice is all set up. Redirecting you to your dashboard in a moment…
          </p>
        </div>
      </WizardLayout>
    );
  }

  // ── Step rendering ─────────────────────────────────────────────────────────
  const renderStep = () => {
    if (!sessionId && step > 1) return null;
    const enabledModules = Object.entries(state.modules).filter(([, on]) => on).map(([id]) => id);
    const cleaningTaskCount = (state.rooms ?? []).length; // approximate
    switch (step) {
      case 1: return <Step1Practice onComplete={onStep1Complete} />;
      case 2: return <Step2Modules sessionId={sessionId!} onBack={() => setStep(1)} onComplete={onStep2Complete} />;
      case 3: return <Step3Inspection sessionId={sessionId!} inspectionData={state.inspectionData} regulator={state.regulator} onBack={() => setStep(2)} onComplete={onStep3Complete} />;
      case 4: return <Step4Compliance sessionId={sessionId!} modules={state.modules} inspectionData={state.inspectionData} regulator={state.regulator} onBack={() => setStep(3)} onComplete={onStep4Complete} />;
      case 5: return <Step5Rooms sessionId={sessionId!} onBack={() => setStep(4)} onComplete={onStep5Complete} />;
      case 6: return <Step6Cleaning sessionId={sessionId!} rooms={state.rooms} regulator={state.regulator} onBack={() => setStep(5)} onComplete={onStep6Complete} />;
      case 7: return (
        <Step7Review
          sessionId={sessionId!}
          practiceId={null}
          modulesEnabled={enabledModules}
          roomCount={state.rooms.length}
          cleaningTaskCount={cleaningTaskCount}
          onBack={backFromStep7}
          onComplete={handleComplete}
          completing={completing}
        />
      );
      default: return null;
    }
  };

  return (
    <WizardLayout step={step} totalSteps={stepConfig.total} stepLabels={stepConfig.labels}>
      {renderStep()}
    </WizardLayout>
  );
}
