// ── Onboarding Wizard Orchestrator ────────────────────────────────────────────
// Manages step routing and accumulated wizard state. All persistence is
// delegated to each step component — this file only decides which to render.
import { useState } from 'react';
import { WizardLayout }      from './onboarding/WizardLayout';
import { Step1Practice }     from './onboarding/Step1Practice';
import { Step2Modules }      from './onboarding/Step2Modules';
import { Step3Inspection }   from './onboarding/Step3Inspection';
import { Step4Compliance }   from './onboarding/Step4Compliance';
import { Step5Rooms }        from './onboarding/Step5Rooms';
import { Step6Cleaning }     from './onboarding/Step6Cleaning';
import { getStepConfig }     from './onboarding/types';
import type { InspectionData, ModuleSelections, WizardState, Room } from './onboarding/types';

export default function Onboarding() {
  const [step, setStep]           = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState]         = useState<WizardState>({
    regulator: 'cqc', inspectionData: null, modules: {}, rooms: [],
  });

  const stepConfig = getStepConfig(state.modules);
  const cleaningOn = state.modules['cleaning'] !== false;

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

  const onStep4Complete = () => {
    // Skip rooms (5) and cleaning (6) if Cleaning module was disabled in Step 2
    setStep(cleaningOn ? 5 : 7);
  };

  const onStep5Complete = (rooms: Room[]) => {
    setState(prev => ({ ...prev, rooms }));
    setStep(6);
  };

  const onStep6Complete = () => setStep(7);

  // ── Back navigation (cleaning skipped → step 4 backs to step 4 from step 7) ─
  const backFromStep7 = () => setStep(cleaningOn ? 6 : 4);

  // ── Placeholder for step 7 ────────────────────────────────────────────────
  const renderPlaceholder = () => (
    <div className="rounded-lg border bg-background p-8 text-center space-y-3">
      <p className="text-lg font-semibold">Step {step} — Coming Soon</p>
      <p className="text-sm text-muted-foreground">This step will be available in the next release.</p>
      <button type="button" onClick={backFromStep7} className="text-sm text-primary underline">← Go back</button>
    </div>
  );

  // ── Step rendering ─────────────────────────────────────────────────────────
  const renderStep = () => {
    if (!sessionId && step > 1) return null;
    switch (step) {
      case 1: return <Step1Practice onComplete={onStep1Complete} />;
      case 2: return <Step2Modules sessionId={sessionId!} onBack={() => setStep(1)} onComplete={onStep2Complete} />;
      case 3: return <Step3Inspection sessionId={sessionId!} inspectionData={state.inspectionData} regulator={state.regulator} onBack={() => setStep(2)} onComplete={onStep3Complete} />;
      case 4: return <Step4Compliance sessionId={sessionId!} modules={state.modules} inspectionData={state.inspectionData} regulator={state.regulator} onBack={() => setStep(3)} onComplete={onStep4Complete} />;
      case 5: return <Step5Rooms sessionId={sessionId!} onBack={() => setStep(4)} onComplete={onStep5Complete} />;
      case 6: return <Step6Cleaning sessionId={sessionId!} rooms={state.rooms} regulator={state.regulator} onBack={() => setStep(5)} onComplete={onStep6Complete} />;
      default: return renderPlaceholder();
    }
  };

  return (
    <WizardLayout step={step} totalSteps={stepConfig.total} stepLabels={stepConfig.labels}>
      {renderStep()}
    </WizardLayout>
  );
}
