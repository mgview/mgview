interface LoadScenePathPanelProps {
  actionLabel: string;
  helperText?: string;
  loading: boolean;
  onSubmit: () => void;
  onSceneInputChange: (value: string) => void;
  sceneInput: string;
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

export default function LoadScenePathPanel({
  actionLabel,
  helperText,
  loading,
  onSubmit,
  onSceneInputChange,
  sceneInput,
}: LoadScenePathPanelProps) {
  return (
    <section className="panel">
      <h2>Scene</h2>
      {helperText ? <p className="panel-subtitle">{helperText}</p> : null}
      <form
        className="loader-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input
          type="text"
          value={sceneInput}
          onChange={(event) => onSceneInputChange(event.target.value)}
          aria-label="Scene path"
        />
        <button type="submit" disabled={loading || !isJsonPath(sceneInput)}>
          {actionLabel}
        </button>
      </form>
    </section>
  );
}
