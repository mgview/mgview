import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type {
  NormalizedSceneConfig,
  SceneObjectInspection,
  SceneVisual,
  Vector3Like,
  VisualType,
} from '../core/types.ts';
import type { TextRenderMode } from '../core/types.ts';
import { cn } from '../lib/utils.ts';
import {
  degreesToRadians,
  getEditableScalarKeys,
  getTextRenderMode,
  NumericInput,
  radiansToDegrees,
  VISUAL_TYPE_OPTIONS,
} from './editorShared.tsx';
import {
  editorDivider,
  editorFieldLabel,
  editorGrid,
  editorPanelHeader,
  editorPanelHeaderLabel,
  emptyState,
  fieldClass,
  fieldWideClass,
  geometryControlRow,
  inlineTags,
  numericTriplet,
  segmentedToggle,
  segmentedToggleButton,
  segmentedToggleButtonActive,
  tagButton,
  tagButtonActive,
  tagInput,
  textInputWithModeToggle,
  typeSpecificGrid,
  visualCard,
  visualCardList,
} from './editorLayout.ts';
import MaterialPicker from './MaterialPicker.tsx';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';

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

const geometrySelectClass =
  'h-7 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
  const showTextRow = selectedVisualType === 'text';
  const remainingEditableKeys = editableKeys.filter(
    (key) => !gridKeys.includes(key as (typeof gridKeys)[number]) && !(showTextRow && key === 'text')
  );
  const textRenderMode = liveSelectedVisual ? getTextRenderMode(liveSelectedVisual) : '2d';
  const isVisualVisible = liveSelectedVisual?.visible !== false;

  return (
    <>
      {selectedObject ? (
        <div className={editorPanelHeader}>
          <span className={editorPanelHeaderLabel}>Geometries</span>
          <div className={inlineTags}>
            {selectedObject.visuals.map((visual) =>
              renamingVisualName === visual.name ? (
                <Input
                  key={visual.name}
                  className={tagInput}
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
                  className={cn(tagButton, selectedVisual?.name === visual.name && tagButtonActive)}
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
          <div className="flex shrink-0 gap-1 self-start">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label="Add geometry"
              title="Add geometry"
              onClick={() => createVisual('sphere')}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label="Delete geometry"
              title="Delete geometry"
              disabled={!selectedVisual}
              onClick={() => {
                void deleteSelectedVisual();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      {selectedObject && selectedVisual && liveSelectedVisual ? (
        <div className={visualCardList}>
          <div className={visualCard}>
            <div className={editorGrid}>
              <div className={fieldClass()}>
                <span className={editorFieldLabel}>Geometry Type</span>
                <div className={geometryControlRow}>
                  <select
                    className={geometrySelectClass}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      'h-8 w-8 shrink-0',
                      isVisualVisible && 'border-primary/30 bg-muted/70 text-foreground'
                    )}
                    aria-label={isVisualVisible ? 'Hide visual' : 'Show visual'}
                    aria-pressed={isVisualVisible}
                    onClick={() => handleVisibleChange(liveSelectedVisual.visible === false)}
                  >
                    {isVisualVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <label className={fieldClass()}>
                <span className={editorFieldLabel}>Material</span>
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
              <div className={fieldWideClass()}>
                <span className={editorFieldLabel}>Position (m)</span>
                <div className={numericTriplet}>
                  <NumericInput
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
              <div className={fieldWideClass()}>
                <span className={editorFieldLabel}>Rotation (deg)</span>
                <div className={numericTriplet}>
                  <NumericInput
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

              <div className={editorDivider} aria-hidden="true" />

              {liveSelectedVisual.size ? (
                <div className={fieldWideClass()}>
                  <span className={editorFieldLabel}>Size</span>
                  <div className={numericTriplet}>
                    <NumericInput
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
                <div className={fieldWideClass()}>
                  <span className={editorFieldLabel}>Grid</span>
                  <div className={numericTriplet}>
                    <NumericInput
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

              {showTextRow ? (
                <label className={fieldWideClass()}>
                  <span className={editorFieldLabel}>Text</span>
                  <div className={textInputWithModeToggle}>
                    <Input
                      type="text"
                      value={typeof liveSelectedVisual.text === 'string' ? liveSelectedVisual.text : ''}
                      onChange={(event) => {
                        updateSelectedVisual((visual) => {
                          visual.text = event.target.value;
                        });
                      }}
                    />
                    <div className={segmentedToggle} role="radiogroup" aria-label="Text render mode">
                      {(['2d', '3d'] as const).map((mode: TextRenderMode) => (
                        <button
                          key={mode}
                          type="button"
                          role="radio"
                          aria-checked={textRenderMode === mode}
                          className={cn(
                            segmentedToggleButton,
                            textRenderMode === mode && segmentedToggleButtonActive
                          )}
                          onClick={() => {
                            updateSelectedVisual((visual) => {
                              visual.text_mode = mode;
                            });
                          }}
                        >
                          {mode.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>
              ) : null}

              {remainingEditableKeys.length > 0 ? (
                <div className={fieldWideClass()}>
                  <div className={typeSpecificGrid}>
                    {remainingEditableKeys.map((key) => {
                      const value = liveSelectedVisual[key];

                      if (typeof value === 'boolean') {
                        return (
                          <div key={key} className={fieldClass('flex items-center gap-2 content-center')}>
                            <span className={editorFieldLabel}>{fieldLabel(key)}</span>
                            <Checkbox
                              checked={value}
                              onCheckedChange={(checked) => {
                                updateSelectedVisual((visual) => {
                                  visual[key] = checked === true;
                                });
                              }}
                            />
                          </div>
                        );
                      }

                      if (typeof value === 'number') {
                        return (
                          <label key={key} className={fieldClass()}>
                            <span className={editorFieldLabel}>{fieldLabel(key)}</span>
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
                          <label key={key} className={fieldClass()}>
                            <span className={editorFieldLabel}>{fieldLabel(key)}</span>
                            <Input
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

              <label className={fieldWideClass()}>
                <span className={editorFieldLabel}>Rotation Frame</span>
                <Input
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
        <div className={emptyState}>Select an object and visual to edit its draft scene state.</div>
      )}
    </>
  );
}
