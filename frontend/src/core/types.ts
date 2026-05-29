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

export interface SceneVisual {
  visible?: boolean;
  type: VisualType | null;
  position?: Vector3Like;
  rotation?: Vector3Like;
  material?: SceneMaterial;
  text?: string;
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

export interface SceneConfig {
  name?: string;
  simulationData?: string[];
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
  objects?: Record<string, SceneObject>;
  spans?: Record<string, SceneSpan>;
}

export interface NormalizedSceneConfig extends SceneConfig {
  simulationData: string[];
  newtonianFrame: string;
  sceneOrigin: string;
  backgroundColor: string;
  showAxes: boolean;
  workspaceSize: number;
  cameraParentFrame: string;
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
}

export interface RenderBasisVisual extends RenderVisualBase {
  type: 'basis';
  scale: number;
}

export interface RenderLineSpan {
  name: string;
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
