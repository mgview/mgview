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
      <h2>Scene</h2>
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
          Load
        </button>
      </form>
    </section>
  );
}
