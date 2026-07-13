import { useState } from 'react';
import type { SimulationImportDetection } from '../hooks/useMotionGenesisWorkspace.ts';
import { Button } from './ui/button.tsx';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.tsx';

interface ImportSimulationDataDialogProps {
  detections: SimulationImportDetection[];
  loading?: boolean;
  onClose: () => void;
  onImportAsData: (entries: string[]) => void;
  onImportAsScenarios: (detections: SimulationImportDetection[]) => void;
}

export default function ImportSimulationDataDialog({
  detections,
  loading = false,
  onClose,
  onImportAsData,
  onImportAsScenarios,
}: ImportSimulationDataDialogProps) {
  const [selectedEntries, setSelectedEntries] = useState<string[]>(() =>
    detections.map((detection) => detection.simulationDataEntry)
  );
  const multipleDetections = detections.length > 1;

  const toggleEntry = (entry: string) => {
    setSelectedEntries((current) =>
      current.includes(entry) ? current.filter((value) => value !== entry) : [...current, entry]
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="compact" onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="min-w-0 flex-1">
            <DialogTitle>Import Simulation Data?</DialogTitle>
            <DialogDescription className="mt-0.5">
              Motion Genesis finished with ODE output files. Import them into this scene for playback and plots.
              {multipleDetections ? (
                <>
                  {' '}
                  Multiple ODE blocks were detected — use <strong>Import separately</strong> so each initial
                  condition set can be switched independently via the Sim Data dropdown.
                </>
              ) : null}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-2">
            <ul className="grid gap-1.5 text-xs">
              {detections.map((detection) => (
                <li key={detection.odeBasePath} className="rounded-sm border border-border px-2 py-1.5">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedEntries.includes(detection.simulationDataEntry)}
                      onChange={() => toggleEntry(detection.simulationDataEntry)}
                    />
                    <span className="grid gap-0.5">
                      <span className="font-medium text-foreground">{detection.odeBasePath}</span>
                      <code className="text-muted-foreground">{detection.simulationDataEntry}</code>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap justify-end gap-1.5">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Not now
              </Button>
              {multipleDetections ? (
                <Button
                  type="button"
                  disabled={loading || selectedEntries.length === 0}
                  onClick={() => {
                    const selected = detections.filter((detection) =>
                      selectedEntries.includes(detection.simulationDataEntry)
                    );
                    onImportAsScenarios(selected);
                  }}
                >
                  {loading ? 'Importing…' : 'Import separately'}
                </Button>
              ) : null}
              <Button
                type="button"
                variant={multipleDetections ? 'outline' : 'default'}
                disabled={loading || selectedEntries.length === 0}
                onClick={() => onImportAsData(selectedEntries)}
              >
                {loading ? 'Importing…' : multipleDetections ? 'Import selected (flat)' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
