import { useEffect, useState } from 'react';
import type { SceneMaterial, SceneObjectInspection, SceneVisual, Vector3Like, VisualType } from '../core/types.ts';
import {
  createDefaultVisual,
  degreesToRadians,
  formatVector,
  getEditableScalarKeys,
  NumericInput,
  radiansToDegrees,
  VISUAL_TYPE_OPTIONS,
} from './editorShared.tsx';

interface VisualEditorPanelProps {
  liveSelectedVisual?: SceneVisual;
  selectedObject?: SceneObjectInspection;
  selectedVisual?: SceneObjectInspection['visuals'][number];
  setSelectedVisualName: (name: string | null) => void;
  createVisual: (name: string, type: VisualType) => boolean;
  deleteSelectedVisual: () => boolean;
  changeSelectedVisualType: (type: VisualType) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
}

function updateVectorAxis(
  currentValue: Vector3Like | undefined,
  axis: keyof Vector3Like,
  nextValue: number
): Vector3Like {
  return {
    ...(currentValue ?? { x: 0, y: 0, z: 0 }),
    [axis]: nextValue,
  };
}

function fieldLabel(key: string): string {
  if (key.startsWith('segments_')) {
    return key.replace('segments_', 'Segments ');
  }

  switch (key) {
    case 'radius1':
      return 'Radius 1';
    case 'radius2':
      return 'Radius 2';
    default:
      return key.replace(/_/g, ' ');
  }
}

function materialName(material: SceneMaterial | undefined): string {
  if (typeof material === 'string') {
    return material;
  }

  return material?.name ?? '';
}

export default function VisualEditorPanel({
  liveSelectedVisual,
  selectedObject,
  selectedVisual,
  setSelectedVisualName,
  createVisual,
  deleteSelectedVisual,
  changeSelectedVisualType,
  updateSelectedVisual,
}: VisualEditorPanelProps) {
  const [newVisualName, setNewVisualName] = useState('');

  useEffect(() => {
    setNewVisualName('');
  }, [selectedObject?.name]);

  const selectedVisualType = (liveSelectedVisual?.type ?? selectedVisual?.type ?? 'sphere') as VisualType;

  const handleCreateVisual = () => {
    const trimmedName = newVisualName.trim();
    if (!trimmedName) {
      return;
    }

    if (createVisual(trimmedName, 'sphere')) {
      setNewVisualName('');
    }
  };

  const handleVisibleChange = (nextChecked: boolean) => {
    updateSelectedVisual((visual) => {
      visual.visible = nextChecked;
    });
  };

  const handleGeometryTypeChange = (nextType: VisualType) => {
    changeSelectedVisualType(nextType);
  };

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
              <label>Visuals</label>
              <div className="visual-toolbar">
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
                <div className="visual-toolbar-actions">
                  <input
                    type="text"
                    value={newVisualName}
                    placeholder="New visual name"
                    onChange={(event) => setNewVisualName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleCreateVisual();
                      }
                    }}
                  />
                  <button type="button" className="secondary-button" onClick={handleCreateVisual}>
                    Add
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!selectedVisual}
                    onClick={() => {
                      void deleteSelectedVisual();
                    }}
                  >
                    Delete
                  </button>
                </div>
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
                <span className="tag">{liveSelectedVisual.type ?? 'unknown'}</span>
                <span className="tag">{liveSelectedVisual.visible !== false ? 'visible' : 'hidden'}</span>
              </div>
            </div>

            <div className="editor-grid">
              <label className="editor-field">
                <span>Geometry Type</span>
                <select
                  value={selectedVisualType}
                  onChange={(event) => handleGeometryTypeChange(event.target.value as VisualType)}
                  onInput={(event) => handleGeometryTypeChange((event.target as HTMLSelectElement).value as VisualType)}
                >
                  {VISUAL_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editor-field editor-field-checkbox">
                <span>Visible</span>
                <input
                  type="checkbox"
                  checked={liveSelectedVisual.visible !== false}
                  onChange={(event) => handleVisibleChange(event.target.checked)}
                  onClick={(event) => handleVisibleChange((event.target as HTMLInputElement).checked)}
                />
              </label>
              <label className="editor-field">
                <span>Material / Color</span>
                <input
                  type="text"
                  value={materialName(liveSelectedVisual.material)}
                  onChange={(event) => {
                    updateSelectedVisual((visual) => {
                      visual.material = {
                        ...(typeof visual.material === 'string' ? { name: visual.material } : visual.material ?? { name: '' }),
                        name: event.target.value,
                      };
                    });
                  }}
                />
              </label>
              <div className="editor-field editor-field-spacer" />
              <label className="editor-field">
                <span>Position X (m)</span>
                <NumericInput
                  value={liveSelectedVisual.position?.x ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.position = updateVectorAxis(visual.position, 'x', nextValue);
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Position Y (m)</span>
                <NumericInput
                  value={liveSelectedVisual.position?.y ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.position = updateVectorAxis(visual.position, 'y', nextValue);
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Position Z (m)</span>
                <NumericInput
                  value={liveSelectedVisual.position?.z ?? 0}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.position = updateVectorAxis(visual.position, 'z', nextValue);
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Rotation X (deg)</span>
                <NumericInput
                  value={radiansToDegrees(liveSelectedVisual.rotation?.x ?? 0)}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.rotation = updateVectorAxis(
                        visual.rotation,
                        'x',
                        degreesToRadians(nextValue)
                      );
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Rotation Y (deg)</span>
                <NumericInput
                  value={radiansToDegrees(liveSelectedVisual.rotation?.y ?? 0)}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.rotation = updateVectorAxis(
                        visual.rotation,
                        'y',
                        degreesToRadians(nextValue)
                      );
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Rotation Z (deg)</span>
                <NumericInput
                  value={radiansToDegrees(liveSelectedVisual.rotation?.z ?? 0)}
                  onValueChange={(nextValue) => {
                    updateSelectedVisual((visual) => {
                      visual.rotation = updateVectorAxis(
                        visual.rotation,
                        'z',
                        degreesToRadians(nextValue)
                      );
                    });
                  }}
                />
              </label>

              {liveSelectedVisual.size ? (
                <>
                  <label className="editor-field">
                    <span>Size X</span>
                    <NumericInput
                      value={liveSelectedVisual.size.x}
                      onValueChange={(nextValue) => {
                        updateSelectedVisual((visual) => {
                          visual.size = updateVectorAxis(visual.size, 'x', nextValue);
                        });
                      }}
                    />
                  </label>
                  <label className="editor-field">
                    <span>Size Y</span>
                    <NumericInput
                      value={liveSelectedVisual.size.y}
                      onValueChange={(nextValue) => {
                        updateSelectedVisual((visual) => {
                          visual.size = updateVectorAxis(visual.size, 'y', nextValue);
                        });
                      }}
                    />
                  </label>
                  <label className="editor-field">
                    <span>Size Z</span>
                    <NumericInput
                      value={liveSelectedVisual.size.z}
                      onValueChange={(nextValue) => {
                        updateSelectedVisual((visual) => {
                          visual.size = updateVectorAxis(visual.size, 'z', nextValue);
                        });
                      }}
                    />
                  </label>
                </>
              ) : null}

              {getEditableScalarKeys(liveSelectedVisual).map((key) => {
                const value = liveSelectedVisual[key];

                if (typeof value === 'boolean') {
                  return (
                    <label key={key} className="editor-field editor-field-checkbox">
                      <span>{fieldLabel(key)}</span>
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
                      <span>{fieldLabel(key)}</span>
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
                      <span>{fieldLabel(key)}</span>
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
