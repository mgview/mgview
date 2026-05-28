interface LoadScenePathPanelProps {
  actionLabel: string;
  inputLabel?: string;
  helperText?: string;
  hideSectionTitle?: boolean;
  loading: boolean;
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
  inputLabel = 'Scene Path',
  helperText,
  hideSectionTitle = false,
  loading,
  onSubmit,
  onSceneInputChange,
  placeholder,
  sceneInput,
}: LoadScenePathPanelProps) {
  return (
    <section className="panel">
      {!hideSectionTitle ? <h2>Scene</h2> : null}
      {helperText ? <p className="panel-subtitle">{helperText}</p> : null}
      <form
        className="loader-form loader-form-single"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="loader-field">
          {inputLabel ? <span>{inputLabel}</span> : null}
          <input
            type="text"
            value={sceneInput}
            onChange={(event) => onSceneInputChange(event.target.value)}
            aria-label={inputLabel || 'Scene path'}
            placeholder={placeholder}
          />
        </label>
        <button type="submit" disabled={loading || !isJsonPath(sceneInput)}>
          {actionLabel}
        </button>
      </form>
    </section>
  );
}
