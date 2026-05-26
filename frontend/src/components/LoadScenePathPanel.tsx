interface LoadScenePathPanelProps {
  loading: boolean;
  onOpen: () => void;
  onSceneInputChange: (value: string) => void;
  sceneInput: string;
}

function isJsonPath(filePath: string): boolean {
  return filePath.toLowerCase().endsWith('.json');
}

export default function LoadScenePathPanel({
  loading,
  onOpen,
  onSceneInputChange,
  sceneInput,
}: LoadScenePathPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Selected Path</h2>
          <p className="panel-subtitle">Only JSON scene files can be opened.</p>
        </div>
      </div>
      <form
        className="loader-form"
        onSubmit={(event) => {
          event.preventDefault();
          onOpen();
        }}
      >
        <input
          type="text"
          value={sceneInput}
          onChange={(event) => onSceneInputChange(event.target.value)}
          aria-label="Scene path"
        />
        <button type="submit" disabled={loading || !isJsonPath(sceneInput)}>
          Open
        </button>
      </form>
    </section>
  );
}
