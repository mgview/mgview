import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';

interface LoadScenePathPanelProps {
  actionLabel: string;
  inputLabel?: string;
  helperText?: string;
  hideSectionTitle?: boolean;
  loading: boolean;
  submitDisabled?: boolean;
  onSubmit: () => void;
  onSceneInputChange: (value: string) => void;
  placeholder?: string;
  sceneInput: string;
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

export default function LoadScenePathPanel({
  actionLabel,
  inputLabel,
  helperText,
  hideSectionTitle = false,
  loading,
  submitDisabled = false,
  onSubmit,
  onSceneInputChange,
  placeholder,
  sceneInput,
}: LoadScenePathPanelProps) {
  return (
    <div className="grid gap-1.5">
      {!hideSectionTitle ? (
        <h3 className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">Scene</h3>
      ) : null}
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      <form
        className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-1">
          {inputLabel ? <Label>{inputLabel}</Label> : null}
          <Input
            type="text"
            value={sceneInput}
            onChange={(event) => onSceneInputChange(event.target.value)}
            aria-label={inputLabel || 'Scene path'}
            placeholder={placeholder}
          />
        </div>
        <Button type="submit" size="sm" disabled={loading || submitDisabled || !isJsonPath(sceneInput)}>
          {actionLabel}
        </Button>
      </form>
    </div>
  );
}
