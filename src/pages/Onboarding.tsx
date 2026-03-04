// ── Onboarding Wizard Orchestrator ────────────────────────────────────────────
// Manages wizard step routing and accumulated state across steps 1-4 (and
// beyond as steps 5-7 are built). All persistence is delegated to each step
// component; this file just decides which step to render.
import { useState } from 'react';
import { WizardLayout } from './onboarding/WizardLayout';
import { Step1Practice } from './onboarding/Step1Practice';
import { Step2Modules } from './onboarding/Step2Modules';
import { Step3Inspection } from './onboarding/Step3Inspection';
import { Step4Compliance } from './onboarding/Step4Compliance';
import { getStepConfig } from './onboarding/types';
import type { InspectionData, ModuleSelections, WizardState } from './onboarding/types';

const DEFAULT_MODULES: ModuleSelections = {}; // Step2 initialises to all-on

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [wizardState, setWizardState] = useState<WizardState>({
    regulator: 'cqc',
    inspectionData: null,
    modules: DEFAULT_MODULES,
  });

  const stepConfig = getStepConfig(wizardState.modules);

  // ── Step completion handlers ───────────────────────────────────────────────

  const onStep1Complete = (sid: string, inspection: InspectionData | null, regulator: 'cqc' | 'hiw') => {
    setSessionId(sid);
    setWizardState(prev => ({ ...prev, regulator, inspectionData: inspection }));
    setStep(2);
  };

  const onStep2Complete = (modules: ModuleSelections) => {
    setWizardState(prev => ({ ...prev, modules }));
    setStep(3);
  };

  const onStep3Complete = (inspection: InspectionData) => {
    setWizardState(prev => ({ ...prev, inspectionData: inspection }));
    setStep(4);
  };

  const onStep4Complete = () => {
    // If cleaning is disabled, skip rooms (5) and cleaning (6) → jump to step 7
    const nextStep = wizardState.modules['cleaning'] === false ? 7 : 5;
    setStep(nextStep);
  };

  // ── Placeholder for steps 5-7 ─────────────────────────────────────────────
  const renderPlaceholder = () => (
    <div className="rounded-lg border bg-background p-8 text-center space-y-2">
      <p className="text-lg font-semibold">Step {step} — Coming Soon</p>
      <p className="text-sm text-muted-foreground">This step will be available in the next release.</p>
    </div>
  );

  // ── Step rendering ─────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Practice onComplete={onStep1Complete} />;
      case 2:
        return sessionId
          ? <Step2Modules sessionId={sessionId} onBack={() => setStep(1)} onComplete={onStep2Complete} />
          : null;
      case 3:
        return sessionId
          ? <Step3Inspection sessionId={sessionId} inspectionData={wizardState.inspectionData} regulator={wizardState.regulator} onBack={() => setStep(2)} onComplete={onStep3Complete} />
          : null;
      case 4:
        return sessionId
          ? <Step4Compliance sessionId={sessionId} modules={wizardState.modules} inspectionData={wizardState.inspectionData} regulator={wizardState.regulator} onBack={() => setStep(3)} onComplete={onStep4Complete} />
          : null;
      default:
        return renderPlaceholder();
    }
  };

  return (
    <WizardLayout step={step} totalSteps={stepConfig.total} stepLabels={stepConfig.labels}>
      {renderStep()}
    </WizardLayout>
  );
}
