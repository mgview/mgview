export type ObjectType = 'frame' | 'point' | string;
export type VisualType =
  | 'sphere'
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'grid'
  | 'mesh'
  | 'text'
  | 'basis'
  | string;

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface MaterialDefinition {
  name: string;
  color?: RgbaColor;
}

export type SceneMaterial = MaterialDefinition | string;
export type SpanVisualKind = 'line' | 'cylinder' | 'spring';
export type SpanLineStyle = 'solid' | 'dashed';
export type TextRenderMode = '2d' | '3d';

export interface SceneVisual {
  visible?: boolean;
  type: VisualType | null;
  position?: Vector3Like;
  rotation?: Vector3Like;
  material?: SceneMaterial;
  text?: string;
  text_mode?: TextRenderMode;
  path?: string;
  scale?: number;
  radius?: number;
  radius1?: number;
  radius2?: number;
  length?: number;
  thickness?: number;
  capped?: boolean;
  segments_width?: number;
  segments_height?: number;
  segments_depth?: number;
  segments_radius?: number;
  segments_thickness?: number;
  cell_size?: number;
  count_x?: number;
  count_y?: number;
  size?: Vector3Like;
  [key: string]: unknown;
}

export interface SceneSpanVisual {
  visible?: boolean;
  kind?: SpanVisualKind;
  lineStyle?: SpanLineStyle;
  material?: SceneMaterial;
  stretchMaterial?: SceneMaterial;
  width?: number;
  naturalLength?: number;
  coilWidth?: number;
  stretchWidth?: number;
  thickness?: number;
}

export interface SceneSpan {
  type?: string;
  point1: string;
  point2: string;
  showLabel?: boolean;
  visual?: Record<string, SceneSpanVisual>;
}

export interface SceneObject {
  type: ObjectType;
  rotationFrame?: string;
  showBasis?: boolean;
  showLabel?: boolean;
  visual?: Record<string, SceneVisual>;
}

export type PlotPanelXMode = 'time' | 'channel';

export interface SceneLayoutConfig {
  showRenderer?: boolean;
  showPlots?: boolean;
  showEditorRail?: boolean;
  focusTarget?: 'renderer' | 'plots' | null;
}

export interface PlotPanelConfig {
  id?: string;
  title?: string;
  channels: string[];
  /** Default: plot Y channel(s) vs simulation time. */
  xMode?: PlotPanelXMode;
  /** X channel when xMode is 'channel' (phase / XY plot). */
  xChannel?: string;
  /** Multiply Y channel samples when xMode is 'channel' (default 1). */
  yChannelScale?: number;
  /** Multiply X channel samples when xMode is 'channel' (default 1). */
  xChannelScale?: number;
  /** Default true — fit axes to data until the user zooms or pans. */
  autoScale?: boolean;
  /** Axis limits (meaning depends on autoScale and xMode; see plotAxisConfig). */
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

export interface ScenePlotsConfig {
  panels: PlotPanelConfig[];
  /** Multiplier on default plot vertical size (default 1). */
  heightScale?: number;
}

export interface SceneConfig {
  name?: string;
  simulationData?: string[];
  layout?: SceneLayoutConfig;
  newtonianFrame?: string;
  sceneOrigin?: string;
  backgroundColor?: string;
  showAxes?: boolean;
  workspaceSize?: number;
  cameraParentFrame?: string;
  cameraUp?: [number, number, number];
  cameraEye?: [number, number, number];
  cameraFocus?: [number, number, number];
  speedFactor?: number;
  customMaterials?: Record<string, unknown>;
  plots?: ScenePlotsConfig;
  objects?: Record<string, SceneObject>;
  spans?: Record<string, SceneSpan>;
}

export interface SceneReferenceInference {
  canonical: string | null;
  all: string[];
}

export interface SceneReferenceContext {
  sceneOrigin: SceneReferenceInference;
  newtonianFrame: SceneReferenceInference;
  authoredSceneOrigin: string | null;
  authoredNewtonianFrame: string | null;
}

export interface NormalizedSceneConfig extends SceneConfig {
  layout: SceneLayoutConfig;
  simulationData: string[];
  newtonianFrame: string;
  sceneOrigin: string;
  backgroundColor: string;
  showAxes: boolean;
  workspaceSize: number;
  cameraParentFrame: string;
  referenceContext: SceneReferenceContext;
  plots: ScenePlotsConfig;
  objects: Record<string, SceneObject>;
  spans: Record<string, SceneSpan>;
}

export interface SimulationTableRow {
  time: number;
  values: Record<string, number>;
}

export interface SimulationTable {
  fileLabel?: string;
  channelNames: string[];
  rows: SimulationTableRow[];
}

export interface ParsedSimulationFile {
  filePath: string;
  channelNames: string[];
  sceneOrigin: SceneReferenceInference;
  newtonianFrame: SceneReferenceInference;
}

export interface TimelineFrame {
  time: number;
  data: Record<string, number>;
}

export interface Timeline {
  frames: TimelineFrame[];
  tInitial: number;
  tFinal: number;
  tStep: number;
}

export interface TimelineLookupResult {
  frame: TimelineFrame;
  tFinalExceeded: boolean;
}

export interface SceneDiagnostic {
  severity: 'info' | 'warning';
  message: string;
}

export interface SceneObjectVisualInspection {
  name: string;
  type: VisualType | null;
  visible: boolean;
  materialName: string | null;
  position: Vector3Like | null;
  rotation: Vector3Like | null;
  propertySummary: Array<{
    key: string;
    value: string;
  }>;
  tags: string[];
}

export interface SceneObjectInspection {
  name: string;
  type: ObjectType;
  rotationFrame?: string;
  inferred: boolean;
  missingSimulationData: boolean;
  visualCount: number;
  visuals: SceneObjectVisualInspection[];
  tags: string[];
}

export interface ConcreteVector3 {
  x: number;
  y: number;
  z: number;
}

export interface RenderMaterial {
  name: string;
  color?: RgbaColor;
}

export interface RenderVisualBase {
  name: string;
  type: VisualType;
  visible: boolean;
  position: ConcreteVector3;
  rotation: ConcreteVector3;
  material: RenderMaterial;
}

export interface RenderSphereVisual extends RenderVisualBase {
  type: 'sphere';
  radius: number;
  segmentsWidth: number;
  segmentsHeight: number;
}

export interface RenderBoxVisual extends RenderVisualBase {
  type: 'box';
  size: ConcreteVector3;
  segmentsWidth: number;
  segmentsHeight: number;
  segmentsDepth: number;
}

export interface RenderCylinderVisual extends RenderVisualBase {
  type: 'cylinder';
  radius: number;
  length: number;
  segmentsRadius: number;
  segmentsHeight: number;
  capped: boolean;
}

export interface RenderConeVisual extends RenderVisualBase {
  type: 'cone';
  radiusTop: number;
  radiusBottom: number;
  length: number;
  segmentsRadius: number;
  segmentsHeight: number;
  capped: boolean;
}

export interface RenderTorusVisual extends RenderVisualBase {
  type: 'torus';
  radius: number;
  thickness: number;
  segmentsRadius: number;
  segmentsThickness: number;
  arc?: number;
}

export interface RenderGridVisual extends RenderVisualBase {
  type: 'grid';
  cellSize: number;
  countX: number;
  countY: number;
}

export interface RenderMeshVisual extends RenderVisualBase {
  type: 'mesh';
  path: string;
  scale: number;
}

export interface RenderTextVisual extends RenderVisualBase {
  type: 'text';
  text: string;
  scale: number;
  textMode: TextRenderMode;
}

export interface RenderBasisVisual extends RenderVisualBase {
  type: 'basis';
  scale: number;
}

export interface RenderLineSpan {
  name: string;
  spanName: string;
  visualName: string;
  kind: 'line';
  visible: boolean;
  material: RenderMaterial;
  width: number;
  lineStyle: SpanLineStyle;
  start: ConcreteVector3;
  end: ConcreteVector3;
}

export interface RenderCylinderSpan {
  name: string;
  spanName: string;
  visualName: string;
  kind: 'cylinder';
  visible: boolean;
  material: RenderMaterial;
  width: number;
  segmentsLength: number;
  segmentsRadius: number;
  start: ConcreteVector3;
  end: ConcreteVector3;
}

export interface RenderSpringSpan {
  name: string;
  spanName: string;
  visualName: string;
  kind: 'spring';
  visible: boolean;
  material: RenderMaterial;
  stretchMaterial: RenderMaterial;
  naturalLength: number;
  coilWidth: number;
  stretchWidth: number;
  segmentsRadius: number;
  start: ConcreteVector3;
  end: ConcreteVector3;
}

export type RenderSpan = RenderLineSpan | RenderCylinderSpan | RenderSpringSpan;

export type RenderVisual =
  | RenderSphereVisual
  | RenderBoxVisual
  | RenderCylinderVisual
  | RenderConeVisual
  | RenderTorusVisual
  | RenderGridVisual
  | RenderMeshVisual
  | RenderTextVisual
  | RenderBasisVisual;
