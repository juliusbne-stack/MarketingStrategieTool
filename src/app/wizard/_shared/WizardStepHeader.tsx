interface WizardStepHeaderProps {
  phaseLabel: string;
  stepIndex1Based: number;
  totalSteps: number;
  stepTitle: string;
}

export function WizardStepHeader({
  phaseLabel,
  stepIndex1Based,
  totalSteps,
  stepTitle,
}: WizardStepHeaderProps) {
  return (
    <header className="space-y-1">
      <p className="text-sm text-muted-foreground">{phaseLabel}</p>
      <p className="text-sm text-muted-foreground">
        Schritt {stepIndex1Based} von {totalSteps}
      </p>
      <h2 className="text-2xl font-semibold">{stepTitle}</h2>
    </header>
  );
}
