import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { NormalizedSceneConfig, SceneSpan, SceneSpanVisual } from '../core/types.ts';
import ColorPicker from './ColorPicker.tsx';
import { NumericInput } from './editorShared.tsx';
import {
  LEGACY_COLOR_PRESETS,
  LEGACY_TEXTURE_PRESETS,
  materialDefinitionFromSceneMaterial,
  normalizeMaterialName,
  parseCssColorString,
} from '../core/materialPresets.ts';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Input } from './ui/input.tsx';
import {
  editorFieldLabel,
  editorGrid,
  editorPanelHeader,
  editorPanelHeaderLabel,
  emptyState,
  fieldClass,
  fieldWideClass,
  geometryControlRow,
  inlineTags,
  sectionLabelWithActions,
  tagButton,
  tagButtonActive,
  tagInput,
  visualCard,
  visualCardList,
} from './editorLayout.ts';

const SPAN_VISUAL_KIND_OPTIONS = ['line', 'cylinder', 'spring'] as const;
const POSITION_CHANNEL = /^P_([^_]+)_([^\[]+)\[([123])\]$/;
const SPAN_LINE_STYLE_OPTIONS = ['solid', 'dashed'] as const;
const DEFAULT_LINE_WIDTH = 1;
const DEFAULT_CYLINDER_WIDTH = 0.12;
const DEFAULT_SPRING_NATURAL_LENGTH = 1;
const DEFAULT_SPRING_COIL_WIDTH = 0.12;
const DEFAULT_SPRING_STRETCH_WIDTH = 0.06;
const selectClassName = 'h-7 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs';
const visualToolbarActions = 'flex shrink-0 gap-1.5 self-start';

function materialToColorValue(material: SceneSpanVisual['material']): string {
  const definition = materialDefinitionFromSceneMaterial(material);
  if (parseCssColorString(definition.name)) {
    return definition.name;
  }

  const normalized = normalizeMaterialName(definition.name);
  if (LEGACY_COLOR_PRESETS[normalized]) {
    return LEGACY_COLOR_PRESETS[normalized];
  }
  if (LEGACY_TEXTURE_PRESETS[normalized]?.color) {
    return LEGACY_TEXTURE_PRESETS[normalized].color!;
  }

  return '#c7d2e2';
}

interface SpanEditorPanelProps {
  activeScene: NormalizedSceneConfig | null;
  channelNames: string[];
  createSpanVisual: () => boolean;
  deleteSelectedSpan: () => boolean;
  deleteSelectedSpanVisual: () => boolean;
  liveSelectedSpan?: SceneSpan;
  liveSelectedSpanVisual?: SceneSpanVisual;
  renameSpan: (currentName: string, nextName: string) => boolean;
  renameSpanVisual: (currentName: string, nextName: string) => boolean;
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  selectSpan: (spanName: string, firstVisualName: string | null) => void;
  updateSelectedSpan: (updater: (span: SceneSpan) => void) => void;
  updateSelectedSpanVisual: (updater: (visual: SceneSpanVisual) => void) => void;
  updateSelectedSpanVisualPreview: (updater: (visual: SceneSpanVisual) => void) => void;
}

export default function SpanEditorPanel({
  activeScene,
  channelNames,
  createSpanVisual,
  deleteSelectedSpan,
  deleteSelectedSpanVisual,
  liveSelectedSpan,
  liveSelectedSpanVisual,
  renameSpan,
  renameSpanVisual,
  selectedSpanName,
  selectedSpanVisualName,
  selectSpan,
  updateSelectedSpan,
  updateSelectedSpanVisual,
  updateSelectedSpanVisualPreview,
}: SpanEditorPanelProps) {
  const [spanNameDraft, setSpanNameDraft] = useState(selectedSpanName ?? '');
  const [renamingSpanVisualName, setRenamingSpanVisualName] = useState<string | null>(null);
  const [spanVisualNameDraft, setSpanVisualNameDraft] = useState(selectedSpanVisualName ?? '');
  const pointOptions = useMemo(() => {
    const names = new Set(
      Object.entries(activeScene?.objects ?? {})
        .filter(([, sceneObject]) => sceneObject.type === 'point')
        .map(([name]) => name)
    );
    for (const channelName of channelNames) {
      const match = channelName.match(POSITION_CHANNEL);
      if (match) {
        names.add(match[2]);
      }
    }
    if (liveSelectedSpan?.point1) {
      names.add(liveSelectedSpan.point1);
    }
    if (liveSelectedSpan?.point2) {
      names.add(liveSelectedSpan.point2);
    }
    return [...names];
  }, [activeScene?.objects, channelNames, liveSelectedSpan?.point1, liveSelectedSpan?.point2]);

  useEffect(() => {
    setSpanNameDraft(selectedSpanName ?? '');
  }, [selectedSpanName]);

  useEffect(() => {
    setSpanVisualNameDraft(selectedSpanVisualName ?? '');
  }, [selectedSpanVisualName]);

  useEffect(() => {
    setRenamingSpanVisualName(null);
    setSpanVisualNameDraft('');
  }, [selectedSpanName]);

  const commitSpanRename = () => {
    if (!selectedSpanName) {
      return;
    }

    const didRename = renameSpan(selectedSpanName, spanNameDraft);
    if (!didRename) {
      setSpanNameDraft(selectedSpanName);
    }
  };

  const commitSpanVisualRename = () => {
    if (!renamingSpanVisualName) {
      return;
    }

    const didRename = renameSpanVisual(renamingSpanVisualName, spanVisualNameDraft);
    if (!didRename) {
      setSpanVisualNameDraft(renamingSpanVisualName);
      return;
    }

    setRenamingSpanVisualName(null);
    setSpanVisualNameDraft('');
  };

  const beginSpanVisualRename = (visualName: string) => {
    setRenamingSpanVisualName(visualName);
    setSpanVisualNameDraft(visualName);
  };

  const selectedKind = liveSelectedSpanVisual?.kind ?? 'line';
  const isVisible = liveSelectedSpanVisual?.visible !== false;

  return (
    <>
      {selectedSpanName && liveSelectedSpan ? (
        <div className={visualCardList}>
          <div className={visualCard}>
            <div className={sectionLabelWithActions}>
              <label className={editorFieldLabel}>Span Editor</label>
              <div className={visualToolbarActions}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Delete span"
                  title="Delete span"
                  onClick={() => {
                    void deleteSelectedSpan();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className={cn(editorGrid, 'gap-2')}>
              <label
                className={cn(
                  fieldWideClass(),
                  'relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 overflow-hidden rounded-sm border border-input bg-background'
                )}
              >
                <span className={cn(editorFieldLabel, 'pointer-events-none pl-2.5')}>Name</span>
                <Input
                  type="text"
                  className="h-7 border-0 bg-transparent px-0.5 pr-4 shadow-none focus-visible:ring-0"
                  value={spanNameDraft}
                  aria-label="Span name"
                  onChange={(event) => setSpanNameDraft(event.target.value)}
                  onBlur={commitSpanRename}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitSpanRename();
                    }
                    if (event.key === 'Escape') {
                      setSpanNameDraft(selectedSpanName);
                    }
                  }}
                />
              </label>
              <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
                <label className={fieldClass('min-w-0')}>
                  <span className={editorFieldLabel}>Point 1</span>
                  <select
                    className={selectClassName}
                    value={liveSelectedSpan.point1}
                    onChange={(event) => {
                      updateSelectedSpan((span) => {
                        span.point1 = event.target.value;
                      });
                    }}
                  >
                    {pointOptions.map((pointName) => (
                      <option key={pointName} value={pointName}>
                        {pointName}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mb-px h-7 w-7 self-end"
                  aria-label="Reverse span direction"
                  title="Reverse span direction"
                  onClick={() => {
                    updateSelectedSpan((span) => {
                      const nextPoint1 = span.point2;
                      span.point2 = span.point1;
                      span.point1 = nextPoint1;
                    });
                  }}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </Button>
                <label className={fieldClass('min-w-0')}>
                  <span className={editorFieldLabel}>Point 2</span>
                  <select
                    className={selectClassName}
                    value={liveSelectedSpan.point2}
                    onChange={(event) => {
                      updateSelectedSpan((span) => {
                        span.point2 = event.target.value;
                      });
                    }}
                  >
                    {pointOptions.map((pointName) => (
                      <option key={pointName} value={pointName}>
                        {pointName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className={visualCard}>
            <div className={editorPanelHeader}>
              <span className={editorPanelHeaderLabel}>Span Visuals</span>
              <div className={cn(inlineTags, 'gap-1')}>
                {Object.keys(liveSelectedSpan.visual ?? {}).length > 0 ? (
                  Object.keys(liveSelectedSpan.visual ?? {}).map((visualName) =>
                    renamingSpanVisualName === visualName ? (
                      <Input
                        key={visualName}
                        className={tagInput}
                        type="text"
                        autoFocus
                        value={spanVisualNameDraft}
                        onChange={(event) => setSpanVisualNameDraft(event.target.value)}
                        onBlur={commitSpanVisualRename}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitSpanVisualRename();
                          }
                          if (event.key === 'Escape') {
                            setRenamingSpanVisualName(null);
                            setSpanVisualNameDraft('');
                          }
                        }}
                      />
                    ) : (
                      <button
                        key={visualName}
                        type="button"
                        className={cn(tagButton, selectedSpanVisualName === visualName && tagButtonActive)}
                        title={visualName}
                        onClick={() => {
                          if (selectedSpanVisualName === visualName) {
                            beginSpanVisualRename(visualName);
                          } else {
                            selectSpan(selectedSpanName, visualName);
                          }
                        }}
                      >
                        {visualName}
                      </button>
                    )
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">No span visuals yet.</span>
                )}
              </div>
              <div className={visualToolbarActions}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Add span visual"
                  title="Add span visual"
                  onClick={() => createSpanVisual()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Delete span visual"
                  title="Delete span visual"
                  disabled={!selectedSpanVisualName}
                  onClick={() => {
                    void deleteSelectedSpanVisual();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {selectedSpanVisualName && liveSelectedSpanVisual ? (
              <div className={editorGrid}>
                <div className={fieldClass()}>
                  <span className={editorFieldLabel}>Visual Kind</span>
                  <div className={geometryControlRow}>
                    <select
                      className={selectClassName}
                      value={selectedKind}
                      onChange={(event) => {
                        const nextKind = event.target.value as (typeof SPAN_VISUAL_KIND_OPTIONS)[number];
                        updateSelectedSpanVisual((visual) => {
                          const preservedVisible = visual.visible !== false;
                          if (nextKind === 'line') {
                            Object.assign(visual, {
                              visible: preservedVisible,
                              kind: 'line',
                              material: '#ff8787',
                              width: DEFAULT_LINE_WIDTH,
                              lineStyle: 'solid',
                            });
                            delete visual.stretchMaterial;
                            delete visual.naturalLength;
                            delete visual.coilWidth;
                            delete visual.stretchWidth;
                            delete visual.thickness;
                            return;
                          }
                          if (nextKind === 'cylinder') {
                            Object.assign(visual, {
                              visible: preservedVisible,
                              kind: 'cylinder',
                              material: '#ff8787',
                              width: DEFAULT_CYLINDER_WIDTH,
                            });
                            delete visual.lineStyle;
                            delete visual.stretchMaterial;
                            delete visual.naturalLength;
                            delete visual.coilWidth;
                            delete visual.stretchWidth;
                            delete visual.thickness;
                            return;
                          }

                          Object.assign(visual, {
                            visible: preservedVisible,
                            kind: 'spring',
                            material: '#ff8787',
                            stretchMaterial: '#74c0fc',
                            naturalLength: DEFAULT_SPRING_NATURAL_LENGTH,
                            coilWidth: DEFAULT_SPRING_COIL_WIDTH,
                            stretchWidth: DEFAULT_SPRING_STRETCH_WIDTH,
                          });
                          delete visual.lineStyle;
                          delete visual.width;
                          delete visual.thickness;
                        });
                      }}
                    >
                      {SPAN_VISUAL_KIND_OPTIONS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kind}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn('h-8 w-8 shrink-0', isVisible && 'border-primary/40 bg-muted/70 text-foreground')}
                      aria-label={isVisible ? 'Hide span visual' : 'Show span visual'}
                      aria-pressed={isVisible}
                      onClick={() => {
                        updateSelectedSpanVisual((visual) => {
                          visual.visible = visual.visible === false;
                        });
                      }}
                    >
                      {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {selectedKind === 'line' ? (
                  <>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Color</span>
                      <ColorPicker
                        label="line color"
                        popoverTitle="Line Color"
                        value={materialToColorValue(liveSelectedSpanVisual.material)}
                        onChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.material = nextValue;
                          });
                        }}
                      />
                    </div>
                    <label className={fieldClass()}>
                      <span className={editorFieldLabel}>Style</span>
                      <select
                        className={selectClassName}
                        value={liveSelectedSpanVisual.lineStyle ?? 'solid'}
                        onChange={(event) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.lineStyle = event.target.value as (typeof SPAN_LINE_STYLE_OPTIONS)[number];
                          });
                        }}
                      >
                        {SPAN_LINE_STYLE_OPTIONS.map((style) => (
                          <option key={style} value={style}>
                            {style}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}

                {selectedKind === 'cylinder' ? (
                  <>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Color</span>
                      <ColorPicker
                        label="cylinder color"
                        popoverTitle="Cylinder Color"
                        value={materialToColorValue(liveSelectedSpanVisual.material)}
                        onChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.material = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Width</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.width ?? liveSelectedSpanVisual.thickness ?? 0.12}
                        minValue={0}
                        onValuePreviewChange={(nextValue) => {
                          updateSelectedSpanVisualPreview((visual) => {
                            visual.width = nextValue;
                            delete visual.thickness;
                          });
                        }}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.width = nextValue;
                            delete visual.thickness;
                          });
                        }}
                      />
                    </div>
                  </>
                ) : null}

                {selectedKind === 'spring' ? (
                  <>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Natural Length</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.naturalLength ?? DEFAULT_SPRING_NATURAL_LENGTH}
                        minValue={0}
                        onValuePreviewChange={(nextValue) => {
                          updateSelectedSpanVisualPreview((visual) => {
                            visual.naturalLength = nextValue;
                          });
                        }}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.naturalLength = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Coil Width</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.coilWidth ?? DEFAULT_SPRING_COIL_WIDTH}
                        minValue={0}
                        onValuePreviewChange={(nextValue) => {
                          updateSelectedSpanVisualPreview((visual) => {
                            visual.coilWidth = nextValue;
                          });
                        }}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.coilWidth = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Coil Color</span>
                      <ColorPicker
                        label="coil color"
                        popoverTitle="Coil Color"
                        value={materialToColorValue(liveSelectedSpanVisual.material)}
                        onChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.material = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Stretch Width</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.stretchWidth ?? DEFAULT_SPRING_STRETCH_WIDTH}
                        minValue={0}
                        onValuePreviewChange={(nextValue) => {
                          updateSelectedSpanVisualPreview((visual) => {
                            visual.stretchWidth = nextValue;
                          });
                        }}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.stretchWidth = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className={fieldClass()}>
                      <span className={editorFieldLabel}>Stretch Color</span>
                      <ColorPicker
                        label="stretch color"
                        popoverTitle="Stretch Color"
                        value={materialToColorValue(liveSelectedSpanVisual.stretchMaterial ?? '#74c0fc')}
                        onChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.stretchMaterial = nextValue;
                          });
                        }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className={emptyState}>Add a span visual to control line, cylinder, or spring appearance.</div>
            )}
          </div>
        </div>
      ) : (
        <div className={emptyState}>Select a span to edit its endpoints and visual settings.</div>
      )}
    </>
  );
}
