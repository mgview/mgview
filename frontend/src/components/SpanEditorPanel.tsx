import { useEffect, useMemo, useState } from 'react';
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

const SPAN_VISUAL_KIND_OPTIONS = ['line', 'cylinder', 'spring'] as const;
const POSITION_CHANNEL = /^P_([^_]+)_([^\[]+)\[([123])\]$/;
const SPAN_LINE_STYLE_OPTIONS = ['solid', 'dashed'] as const;
const DEFAULT_LINE_WIDTH = 1;
const DEFAULT_CYLINDER_WIDTH = 0.12;
const DEFAULT_SPRING_NATURAL_LENGTH = 1;
const DEFAULT_SPRING_COIL_WIDTH = 0.12;
const DEFAULT_SPRING_STRETCH_WIDTH = 0.06;

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
  selectedSpanName: string | null;
  selectedSpanVisualName: string | null;
  selectSpan: (spanName: string, firstVisualName: string | null) => void;
  updateSelectedSpan: (updater: (span: SceneSpan) => void) => void;
  updateSelectedSpanVisual: (updater: (visual: SceneSpanVisual) => void) => void;
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
  selectedSpanName,
  selectedSpanVisualName,
  selectSpan,
  updateSelectedSpan,
  updateSelectedSpanVisual,
}: SpanEditorPanelProps) {
  const [spanNameDraft, setSpanNameDraft] = useState(selectedSpanName ?? '');
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

  const commitSpanRename = () => {
    if (!selectedSpanName) {
      return;
    }

    const didRename = renameSpan(selectedSpanName, spanNameDraft);
    if (!didRename) {
      setSpanNameDraft(selectedSpanName);
    }
  };

  const selectedKind = liveSelectedSpanVisual?.kind ?? 'line';
  const isVisible = liveSelectedSpanVisual?.visible !== false;

  return (
    <>
      {selectedSpanName && liveSelectedSpan ? (
        <div className="visual-card-list">
          <div className="visual-card">
            <div className="section-label-with-actions span-editor-header">
              <label>Span Editor</label>
              <div className="visual-toolbar-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Delete span"
                  title="Delete span"
                  onClick={() => {
                    void deleteSelectedSpan();
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
            <div className="editor-grid">
              <label className="editor-field">
                <span>Span Name</span>
                <input
                  type="text"
                  value={spanNameDraft}
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
              <label className="editor-field">
                <span>Point 1</span>
                <select
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
              <label className="editor-field">
                <span>Point 2</span>
                <select
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

          <div className="visual-card">
            <div className="stacked-meta">
              <div className="meta-row">
                <div className="section-label-with-actions">
                  <label>Span Visuals</label>
                  <div className="visual-toolbar-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Add span visual"
                      title="Add span visual"
                      onClick={() => createSpanVisual()}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Delete span visual"
                      title="Delete span visual"
                      disabled={!selectedSpanVisualName}
                      onClick={() => {
                        void deleteSelectedSpanVisual();
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
                <div className="inline-tags">
                  {Object.keys(liveSelectedSpan.visual ?? {}).length > 0 ? (
                    Object.keys(liveSelectedSpan.visual ?? {}).map((visualName) => (
                      <button
                        key={visualName}
                        type="button"
                        className={`tag-button ${selectedSpanVisualName === visualName ? 'tag-button-active' : ''}`}
                        onClick={() => selectSpan(selectedSpanName, visualName)}
                      >
                        {visualName}
                      </button>
                    ))
                  ) : (
                    <span className="empty-state-inline">No span visuals yet.</span>
                  )}
                </div>
              </div>
            </div>

            {selectedSpanVisualName && liveSelectedSpanVisual ? (
              <div className="editor-grid">
                <div className="editor-field">
                  <span>Visual Kind</span>
                  <div className="geometry-control-row">
                    <select
                      className="geometry-select"
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
                    <button
                      type="button"
                      className={`visibility-eye-button ${isVisible ? 'visibility-eye-button-active' : ''}`}
                      aria-label={isVisible ? 'Hide span visual' : 'Show span visual'}
                      aria-pressed={isVisible}
                      onClick={() => {
                        updateSelectedSpanVisual((visual) => {
                          visual.visible = visual.visible === false;
                        });
                      }}
                    >
                      {isVisible ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M10.7 5.2A11.2 11.2 0 0 1 12 5c6.2 0 10 7 10 7a17.7 17.7 0 0 1-4 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.2 6.3C3.7 8.1 2 12 2 12s3.8 6 10 6c1.4 0 2.6-.3 3.8-.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9.9 9.9A3.1 3.1 0 0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {selectedKind === 'line' ? (
                  <>
                    <div className="editor-field">
                      <span>Color</span>
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
                    <label className="editor-field">
                      <span>Style</span>
                      <select
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
                    <div className="editor-field">
                      <span>Color</span>
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
                    <div className="editor-field">
                      <span>Width</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.width ?? liveSelectedSpanVisual.thickness ?? 0.12}
                        minValue={0}
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
                    <div className="editor-field">
                      <span>Natural Length</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.naturalLength ?? DEFAULT_SPRING_NATURAL_LENGTH}
                        minValue={0}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.naturalLength = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className="editor-field">
                      <span>Coil Width</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.coilWidth ?? DEFAULT_SPRING_COIL_WIDTH}
                        minValue={0}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.coilWidth = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className="editor-field">
                      <span>Stretch Width</span>
                      <NumericInput
                        value={liveSelectedSpanVisual.stretchWidth ?? DEFAULT_SPRING_STRETCH_WIDTH}
                        minValue={0}
                        onValueChange={(nextValue) => {
                          updateSelectedSpanVisual((visual) => {
                            visual.stretchWidth = nextValue;
                          });
                        }}
                      />
                    </div>
                    <div className="editor-field">
                      <span>Coil Color</span>
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
                    <div className="editor-field">
                      <span>Stretch Color</span>
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
              <div className="empty-state">Add a span visual to control line, cylinder, or spring appearance.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">Select a span to edit its endpoints and visual settings.</div>
      )}
    </>
  );
}
