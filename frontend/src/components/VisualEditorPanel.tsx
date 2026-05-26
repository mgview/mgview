import type { SceneObjectInspection, SceneVisual } from '../core/types.ts';
import { NumericInput, formatVector, getEditableScalarKeys } from './editorShared.tsx';

interface VisualEditorPanelProps {
  liveSelectedVisual?: SceneVisual;
  selectedObject?: SceneObjectInspection;
  selectedVisual?: SceneObjectInspection['visuals'][number];
  setSelectedVisualName: (name: string | null) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
}

export default function VisualEditorPanel({
  liveSelectedVisual,
  selectedObject,
  selectedVisual,
  setSelectedVisualName,
  updateSelectedVisual,
}: VisualEditorPanelProps) {
  return (
    <>
      <h2>Visual Editor</h2>
      {selectedObject ? (
        <>
          <div className="selected-header">
            <code>{selectedObject.name}</code>
            <span className="tag">{selectedObject.type}</span>
          </div>
          <div className="stacked-meta">
            <div className="meta-row">
              <label>Rotation Frame</label>
              <code>{selectedObject.rotationFrame ?? '(none)'}</code>
            </div>
            <div className="meta-row">
              <label>Selected Visual</label>
              <div className="inline-tags">
                {selectedObject.visuals.map((visual) => (
                  <button
                    key={visual.name}
                    type="button"
                    className={`tag-button ${selectedVisual?.name === visual.name ? 'tag-button-active' : ''}`}
                    onClick={() => setSelectedVisualName(visual.name)}
                  >
                    {visual.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="meta-row">
              <label>Inspector Tags</label>
              <div className="inline-tags">
                {selectedObject.tags.length > 0 ? (
                  selectedObject.tags.map((tag) => (
                    <span key={tag} className="tag tag-accent">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="tag">none</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">Select an object to inspect its visuals.</div>
      )}

      {selectedObject && selectedVisual && liveSelectedVisual ? (
        <div className="visual-card-list">
          <div className="visual-card">
            <div className="visual-card-header">
              <code>{selectedVisual.name}</code>
              <div className="inline-tags">
                <span className="tag">{selectedVisual.type ?? 'unknown'}</span>
                <span className="tag">{selectedVisual.visible ? 'visible' : 'hidden'}</span>
              </div>
            </div>

            <div className="editor-grid">
              <label className="editor-field editor-field-checkbox">
                <span>Visible</span>
                <input
                  type="checkbox"
                  checked={selectedVisual.visible}
                  onChange={(event) => {
                    updateSelectedVisual((visual) => {
                      visual.visible = event.target.checked;
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Material</span>
                <input
                  type="text"
                  value={selectedVisual.materialName ?? ''}
                  onChange={(event) => {
                    updateSelectedVisual((visual) => {
                      visual.material = {
                        ...(visual.material ?? { name: '' }),
                        name: event.target.value,
                      };
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Position X</span>
                <NumericInput
                  value={selectedVisual.position?.x ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), x: nextValue };
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Position Y</span>
                <NumericInput
                  value={selectedVisual.position?.y ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), y: nextValue };
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Position Z</span>
                <NumericInput
                  value={selectedVisual.position?.z ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.position = { ...(visual.position ?? { x: 0, y: 0, z: 0 }), z: nextValue };
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Rotation X</span>
                <NumericInput
                  value={selectedVisual.rotation?.x ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), x: nextValue };
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Rotation Y</span>
                <NumericInput
                  value={selectedVisual.rotation?.y ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), y: nextValue };
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Rotation Z</span>
                <NumericInput
                  value={selectedVisual.rotation?.z ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.rotation = { ...(visual.rotation ?? { x: 0, y: 0, z: 0 }), z: nextValue };
                    });
                  }}
                />
              </label>

              {getEditableScalarKeys(liveSelectedVisual).map((key) => {
                const value = liveSelectedVisual[key];

                if (typeof value === 'boolean') {
                  return (
                    <label key={key} className="editor-field editor-field-checkbox">
                      <span>{key}</span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual[key] = event.target.checked;
                          });
                        }}
                      />
                    </label>
                  );
                }

                if (typeof value === 'number') {
                  return (
                    <label key={key} className="editor-field">
                      <span>{key}</span>
                      <NumericInput
                        value={value}
                        onValueChange={(nextValue) => {
                          updateSelectedVisual((visual) => {
                            visual[key] = nextValue;
                          });
                        }}
                      />
                    </label>
                  );
                }

                if (typeof value === 'string') {
                  return (
                    <label key={key} className="editor-field">
                      <span>{key}</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(event) => {
                          updateSelectedVisual((visual) => {
                            visual[key] = event.target.value;
                          });
                        }}
                      />
                    </label>
                  );
                }

                return null;
              })}
            </div>

            <div className="meta-list visual-meta">
              <div>
                <label>Material</label>
                <code>{selectedVisual.materialName ?? '(none)'}</code>
              </div>
              <div>
                <label>Position</label>
                <code>{formatVector(selectedVisual.position)}</code>
              </div>
              <div>
                <label>Rotation</label>
                <code>{formatVector(selectedVisual.rotation)}</code>
              </div>
              <div>
                <label>Tags</label>
                <div className="inline-tags">
                  {selectedVisual.tags.length > 0 ? (
                    selectedVisual.tags.map((tag) => (
                      <span key={tag} className="tag tag-soft">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="tag">none</span>
                  )}
                </div>
              </div>
              <div className="property-block">
                <label>Geometry Properties</label>
                <div className="property-list">
                  {selectedVisual.propertySummary.length > 0 ? (
                    selectedVisual.propertySummary.map((property) => (
                      <div key={property.key} className="property-item">
                        <span>{property.key}</span>
                        <code>{property.value}</code>
                      </div>
                    ))
                  ) : (
                    <div className="property-item">
                      <span>properties</span>
                      <code>none</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">Select an object and visual to edit its draft scene state.</div>
      )}
    </>
  );
}
