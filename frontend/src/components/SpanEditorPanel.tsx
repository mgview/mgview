import { useEffect, useMemo, useState } from 'react';
import type { NormalizedSceneConfig, SceneSpan, SceneSpanVisual } from '../core/types.ts';
import { NumericInput } from './editorShared.tsx';
import MaterialPicker from './MaterialPicker.tsx';

const SPAN_TYPE_OPTIONS = ['cable'] as const;
const POSITION_CHANNEL = /^P_([^_]+)_([^\[]+)\[([123])\]$/;

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
                <span>Span Type</span>
                <select
                  value={liveSelectedSpan.type}
                  onChange={(event) => {
                    updateSelectedSpan((span) => {
                      span.type = event.target.value;
                    });
                  }}
                >
                  {SPAN_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
              <label className="editor-field editor-field-checkbox">
                <span>Show Label</span>
                <input
                  type="checkbox"
                  checked={liveSelectedSpan.showLabel ?? false}
                  onChange={(event) => {
                    updateSelectedSpan((span) => {
                      span.showLabel = event.target.checked;
                    });
                  }}
                />
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
                  <span>Material</span>
                  <MaterialPicker
                    material={liveSelectedSpanVisual.material}
                    onMaterialChange={(nextMaterial) => {
                      updateSelectedSpanVisual((visual) => {
                        visual.material = {
                          ...nextMaterial,
                        };
                      });
                    }}
                  />
                </div>
                <div className="editor-field">
                  <span>Thickness</span>
                  <NumericInput
                    value={liveSelectedSpanVisual.thickness ?? 1}
                    minValue={0}
                    onValueChange={(nextValue) => {
                      updateSelectedSpanVisual((visual) => {
                        visual.thickness = nextValue;
                      });
                    }}
                  />
                </div>
                <label className="editor-field editor-field-checkbox">
                  <span>Visible</span>
                  <input
                    type="checkbox"
                    checked={liveSelectedSpanVisual.visible !== false}
                    onChange={(event) => {
                      updateSelectedSpanVisual((visual) => {
                        visual.visible = event.target.checked;
                      });
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="empty-state">Add a span visual to control cable appearance.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">Select a span to edit its endpoints and visual settings.</div>
      )}
    </>
  );
}
