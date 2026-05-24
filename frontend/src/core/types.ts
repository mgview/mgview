export type ObjectType = 'frame' | 'point' | string;
export type VisualType =
  | 'sphere'
  | 'box'
  | 'cylinder'
  | 'cone'
  | 'torus'
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

export interface SceneVisual {
  visible?: boolean;
  type: VisualType | null;
  position?: Vector3Like;
  rotation?: Vector3Like;
  material?: MaterialDefinition;
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
  size?: Vector3Like;
  [key: string]: unknown;
}

export interface SceneObject {
  type: ObjectType;
  rotationFrame?: string;
  visual?: Record<string, SceneVisual>;
}

export interface SceneConfig {
  name?: string;
  simulationData?: string[];
  newtonianFrame?: string;
  sceneOrigin?: string;
  showAxes?: boolean;
  workspaceSize?: number;
  cameraParentFrame?: string;
  cameraUp?: [number, number, number];
  cameraEye?: [number, number, number];
  cameraFocus?: [number, number, number];
  speedFactor?: number;
  customMaterials?: Record<string, unknown>;
  objects?: Record<string, SceneObject>;
}

export interface NormalizedSceneConfig extends SceneConfig {
  simulationData: string[];
  newtonianFrame: string;
  sceneOrigin: string;
  showAxes: boolean;
  workspaceSize: number;
  cameraParentFrame: string;
  objects: Record<string, SceneObject>;
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
  visualCount: number;
  visuals: SceneObjectVisualInspection[];
  tags: string[];
}
