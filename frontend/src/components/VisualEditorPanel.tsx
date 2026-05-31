import { useEffect, useState } from 'react';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneVisual,
  Vector3Like,
  VisualType,
} from '../core/types.ts';
import {
  degreesToRadians,
  getEditableScalarKeys,
  NumericInput,
  radiansToDegrees,
  VISUAL_TYPE_OPTIONS,
} from './editorShared.tsx';
import MaterialPicker from './MaterialPicker.tsx';

interface VisualEditorPanelProps {
  liveSelectedVisual?: SceneVisual;
  selectedObject?: SceneObjectInspection;
  selectedVisual?: SceneObjectInspection['visuals'][number];
  setSelectedVisualName: (name: string | null) => void;
  updateSelectedObject: (updater: (sceneObject: NormalizedSceneConfig['objects'][string]) => void) => void;
  createVisual: (type: VisualType) => boolean;
  renameVisual: (currentName: string, nextName: string) => boolean;
  deleteSelectedVisual: () => boolean;
  changeSelectedVisualType: (type: VisualType) => void;
  updateSelectedVisual: (updater: (visual: SceneVisual) => void) => void;
  updateSelectedVisualPreview: (updater: (visual: SceneVisual) => void) => void;
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
    case 'cell_size':
      return 'Cell Size';
    case 'count_x':
      return 'X Count';
    case 'count_y':
      return 'Y Count';
    default:
      return key.replace(/_/g, ' ');
  }
}

function dragStepForKey(key: string): number {
  if (key.startsWith('segments_')) {
    return 1;
  }

  if (key === 'count_x' || key === 'count_y') {
    return 1;
  }

  switch (key) {
    case 'arc':
      return 0.01;
    case 'scale':
      return 0.01;
    case 'radius':
    case 'radius1':
    case 'radius2':
    case 'length':
    case 'thickness':
      return 0.01;
    default:
      return 0.01;
  }
}

function minValueForKey(key: string): number | undefined {
  if (key.startsWith('segments_')) {
    return 1;
  }

  switch (key) {
    case 'cell_size':
      return 0;
    case 'arc':
    case 'scale':
    case 'radius':
    case 'radius1':
    case 'radius2':
    case 'length':
    case 'thickness':
      return 0;
    default:
      return undefined;
  }
}

function isIntegerKey(key: string): boolean {
  return key.startsWith('segments_') || key === 'count_x' || key === 'count_y';
}

export default function VisualEditorPanel({
  liveSelectedVisual,
  selectedObject,
  selectedVisual,
  setSelectedVisualName,
  updateSelectedObject,
  createVisual,
  renameVisual,
  deleteSelectedVisual,
  changeSelectedVisualType,
  updateSelectedVisual,
  updateSelectedVisualPreview,
}: VisualEditorPanelProps) {
  const [renamingVisualName, setRenamingVisualName] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    setRenamingVisualName(null);
    setRenameText('');
  }, [selectedObject?.name]);

  const selectedVisualType = (liveSelectedVisual?.type ?? selectedVisual?.type ?? 'sphere') as VisualType;

  const beginRename = (visualName: string) => {
    setRenamingVisualName(visualName);
    setRenameText(visualName);
  };

  const commitRename = () => {
    if (!renamingVisualName) {
      return;
    }

    const didRename = renameVisual(renamingVisualName, renameText);
    if (didRename) {
      setRenamingVisualName(null);
      setRenameText('');
    }
  };

  const handleVisibleChange = (nextChecked: boolean) => {
    updateSelectedVisual((visual) => {
      visual.visible = nextChecked;
    });
  };

  const editableKeys = getEditableScalarKeys(liveSelectedVisual ?? { type: null });
  const gridKeys = ['cell_size', 'count_x', 'count_y'] as const;
  const showGridRow = gridKeys.every((key) => editableKeys.includes(key));
  const remainingEditableKeys = editableKeys.filter((key) => !gridKeys.includes(key as (typeof gridKeys)[number]));

  return (
    <>
      {selectedObject ? (
        <div className="editor-panel-header">
          <span className="editor-panel-header-label">Geometries</span>
          <div className="inline-tags">
            {selectedObject.visuals.map((visual) =>
              renamingVisualName === visual.name ? (
                <input
                  key={visual.name}
                  className="tag-input"
                  type="text"
                  autoFocus
                  value={renameText}
                  onChange={(event) => setRenameText(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitRename();
                    }
                    if (event.key === 'Escape') {
                      setRenamingVisualName(null);
                      setRenameText('');
                    }
                  }}
                />
              ) : (
                <button
                  key={visual.name}
                  type="button"
                  className={`tag-button ${selectedVisual?.name === visual.name ? 'tag-button-active' : ''}`}
                  title={visual.name}
                  onClick={() => {
                    if (selectedVisual?.name === visual.name) {
                      beginRename(visual.name);
                    } else {
                      setSelectedVisualName(visual.name);
                    }
                  }}
                >
                  {visual.name}
                </button>
              )
            )}
          </div>
          <div className="visual-toolbar-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Add geometry"
              title="Add geometry"
              onClick={() => createVisual('sphere')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Delete geometry"
              title="Delete geometry"
              disabled={!selectedVisual}
              onClick={() => {
                void deleteSelectedVisual();
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12M10 11v5M14 11v5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {selectedObject && selectedVisual && liveSelectedVisual ? (
        <div className="visual-card-list">
          <div className="visual-card">
            <div className="editor-grid">
              <div className="editor-field">
                <span>Geometry Type</span>
                <div className="geometry-control-row">
                  <select
                    className="geometry-select"
                    value={selectedVisualType}
                    onChange={(event) => changeSelectedVisualType(event.target.value as VisualType)}
                    onInput={(event) => changeSelectedVisualType((event.target as HTMLSelectElement).value as VisualType)}
                  >
                    {VISUAL_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`visibility-eye-button ${liveSelectedVisual.visible !== false ? 'visibility-eye-button-active' : ''}`}
                    aria-label={liveSelectedVisual.visible !== false ? 'Hide visual' : 'Show visual'}
                    aria-pressed={liveSelectedVisual.visible !== false}
                    onClick={() => handleVisibleChange(liveSelectedVisual.visible === false)}
                  >
                    {liveSelectedVisual.visible !== false ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M3 3l18 18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.7 5.2A11.2 11.2 0 0 1 12 5c6.2 0 10 7 10 7a17.7 17.7 0 0 1-4 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6.2 6.3C3.7 8.1 2 12 2 12s3.8 6 10 6c1.4 0 2.6-.3 3.8-.8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.9 9.9A3.1 3.1 0 0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <label className="editor-field">
                <span>Material</span>
                <MaterialPicker
                  material={liveSelectedVisual.material}
                  onMaterialPreviewChange={(nextMaterial) => {
                    updateSelectedVisualPreview((visual) => {
                      visual.material = {
                        ...nextMaterial,
                      };
                    });
                  }}
                  onMaterialChange={(nextMaterial) => {
                    updateSelectedVisual((visual) => {
                      visual.material = {
                        ...nextMaterial,
                      };
                    });
                  }}
                />
              </label>
              <div className="editor-field editor-field-wide">
                <span>Position (m)</span>
                <div className="numeric-triplet">
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="x"
                    value={liveSelectedVisual.position?.x ?? 0}
                    dragStep={0.01}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.position = updateVectorAxis(visual.position, 'x', nextValue);
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.position = updateVectorAxis(visual.position, 'x', nextValue);
                      });
                    }}
                  />
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="y"
                    value={liveSelectedVisual.position?.y ?? 0}
                    dragStep={0.01}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.position = updateVectorAxis(visual.position, 'y', nextValue);
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.position = updateVectorAxis(visual.position, 'y', nextValue);
                      });
                    }}
                  />
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="z"
                    value={liveSelectedVisual.position?.z ?? 0}
                    dragStep={0.01}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.position = updateVectorAxis(visual.position, 'z', nextValue);
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.position = updateVectorAxis(visual.position, 'z', nextValue);
                      });
                    }}
                  />
                </div>
              </div>
              <div className="editor-field editor-field-wide">
                <span>Rotation (deg)</span>
                <div className="numeric-triplet">
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="x"
                    value={radiansToDegrees(liveSelectedVisual.rotation?.x ?? 0)}
                    dragStep={0.25}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.rotation = updateVectorAxis(visual.rotation, 'x', degreesToRadians(nextValue));
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.rotation = updateVectorAxis(visual.rotation, 'x', degreesToRadians(nextValue));
                      });
                    }}
                  />
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="y"
                    value={radiansToDegrees(liveSelectedVisual.rotation?.y ?? 0)}
                    dragStep={0.25}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.rotation = updateVectorAxis(visual.rotation, 'y', degreesToRadians(nextValue));
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.rotation = updateVectorAxis(visual.rotation, 'y', degreesToRadians(nextValue));
                      });
                    }}
                  />
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="z"
                    value={radiansToDegrees(liveSelectedVisual.rotation?.z ?? 0)}
                    dragStep={0.25}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.rotation = updateVectorAxis(visual.rotation, 'z', degreesToRadians(nextValue));
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.rotation = updateVectorAxis(visual.rotation, 'z', degreesToRadians(nextValue));
                      });
                    }}
                  />
                </div>
              </div>

              <div className="editor-divider" aria-hidden="true" />

              {liveSelectedVisual.size ? (
                <div className="editor-field editor-field-wide">
                  <span>Size</span>
                  <div className="numeric-triplet">
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="x"
                    value={liveSelectedVisual.size.x}
                    dragStep={0.01}
                    minValue={0}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.size = updateVectorAxis(visual.size, 'x', nextValue);
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.size = updateVectorAxis(visual.size, 'x', nextValue);
                        });
                      }}
                    />
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="y"
                    value={liveSelectedVisual.size.y}
                    dragStep={0.01}
                    minValue={0}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.size = updateVectorAxis(visual.size, 'y', nextValue);
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.size = updateVectorAxis(visual.size, 'y', nextValue);
                        });
                      }}
                    />
                  <NumericInput
                    className="numeric-input-compact"
                    prefixLabel="z"
                    value={liveSelectedVisual.size.z}
                    dragStep={0.01}
                    minValue={0}
                    onValuePreviewChange={(nextValue) => {
                      updateSelectedVisualPreview((visual) => {
                        visual.size = updateVectorAxis(visual.size, 'z', nextValue);
                      });
                    }}
                    onValueChange={(nextValue) => {
                      updateSelectedVisual((visual) => {
                        visual.size = updateVectorAxis(visual.size, 'z', nextValue);
                        });
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {showGridRow ? (
                <div className="editor-field editor-field-wide">
                  <span>Grid</span>
                  <div className="numeric-triplet">
                    <NumericInput
                      className="numeric-input-compact"
                      prefixLabel="cell"
                      value={typeof liveSelectedVisual.cell_size === 'number' ? liveSelectedVisual.cell_size : 0}
                      dragStep={dragStepForKey('cell_size')}
                      minValue={minValueForKey('cell_size')}
                      onValuePreviewChange={(nextValue) => {
                        updateSelectedVisualPreview((visual) => {
                          visual.cell_size = nextValue;
                        });
                      }}
                      onValueChange={(nextValue) => {
                        updateSelectedVisual((visual) => {
                          visual.cell_size = nextValue;
                        });
                      }}
                    />
                    <NumericInput
                      className="numeric-input-compact"
                      prefixLabel="x"
                      value={typeof liveSelectedVisual.count_x === 'number' ? liveSelectedVisual.count_x : 1}
                      dragStep={dragStepForKey('count_x')}
                      minValue={minValueForKey('count_x')}
                      integer={isIntegerKey('count_x')}
                      onValuePreviewChange={(nextValue) => {
                        updateSelectedVisualPreview((visual) => {
                          visual.count_x = nextValue;
                        });
                      }}
                      onValueChange={(nextValue) => {
                        updateSelectedVisual((visual) => {
                          visual.count_x = nextValue;
                        });
                      }}
                    />
                    <NumericInput
                      className="numeric-input-compact"
                      prefixLabel="y"
                      value={typeof liveSelectedVisual.count_y === 'number' ? liveSelectedVisual.count_y : 1}
                      dragStep={dragStepForKey('count_y')}
                      minValue={minValueForKey('count_y')}
                      integer={isIntegerKey('count_y')}
                      onValuePreviewChange={(nextValue) => {
                        updateSelectedVisualPreview((visual) => {
                          visual.count_y = nextValue;
                        });
                      }}
                      onValueChange={(nextValue) => {
                        updateSelectedVisual((visual) => {
                          visual.count_y = nextValue;
                        });
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {remainingEditableKeys.length > 0 ? (
                <div className="editor-field editor-field-wide">
                  <div className="type-specific-grid">
                    {remainingEditableKeys.map((key) => {
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
                              dragStep={dragStepForKey(key)}
                              minValue={minValueForKey(key)}
                              integer={isIntegerKey(key)}
                              onValuePreviewChange={(nextValue) => {
                                updateSelectedVisualPreview((visual) => {
                                  visual[key] = nextValue;
                                });
                              }}
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
                </div>
              ) : null}

              <label className="editor-field editor-field-wide">
                <span>Rotation Frame</span>
                <input
                  type="text"
                  value={selectedObject.rotationFrame ?? ''}
                  placeholder="(none)"
                  onChange={(event) => {
                    updateSelectedObject((sceneObject) => {
                      const nextValue = event.target.value.trim();
                      sceneObject.rotationFrame = nextValue.length > 0 ? nextValue : undefined;
                    });
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">Select an object and visual to edit its draft scene state.</div>
      )}
    </>
  );
}
