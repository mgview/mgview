export interface VisualTransformValue {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export function createVisualTransformGestureCoordinator<T = VisualTransformValue>({
  onCommit,
  onPreview,
}: {
  onCommit: (transform: T) => void;
  onPreview: (transform: T) => void;
}) {
  let changed = false;

  return {
    begin() {
      changed = false;
    },
    change(transform: T) {
      if (!changed) {
        changed = true;
        onCommit(transform);
        return;
      }

      onPreview(transform);
    },
    end() {
      changed = false;
    },
  };
}
