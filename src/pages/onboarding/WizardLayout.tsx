import { ShieldCheck } from 'lucide-react';

interface WizardLayoutProps {
  step: number;
  totalSteps: number;
  stepLabels: string[];
  children: React.ReactNode;
}

// ── Shared wizard chrome: logo, progress bar, step labels ─────────────────────
// Kept separate so each step component stays under the 300-line limit and the
// progress calculation logic lives in exactly one place.
export function WizardLayout({ step, totalSteps, stepLabels, children }: WizardLayoutProps) {
  const pct = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Logo + title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">FitForAudit</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Practice</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Get your GP surgery audit-ready in minutes.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Step {step} of {totalSteps}</span>
            <span>{pct}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Step labels — visible on md+ only to avoid crowding on mobile */}
          <div className="hidden md:flex justify-between text-xs text-muted-foreground px-1 pt-0.5">
            {stepLabels.map((label, i) => (
              <span
                key={label}
                className={i + 1 <= step ? 'text-primary font-medium' : ''}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {children}

        <p className="text-center text-xs text-muted-foreground">
          Your data is stored securely and never shared. By continuing you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
