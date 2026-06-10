export interface FileBrowserEntry {
  name: string;
  path: string;
  type: 'directory' | 'file';
}

export interface FileBrowserListing {
  path: string;
  parentPath: string | null;
  entries: FileBrowserEntry[];
}

export interface StaticFileManifest {
  version: number;
  listings: Record<string, FileBrowserListing>;
}

export type MotionGenesisRunStatus =
  | 'running'
  | 'waiting-input'
  | 'success'
  | 'failed';

export interface MotionGenesisRunOptions {
  autoQuit: boolean;
  autoDefaultValues: boolean;
  debug: boolean;
}

export interface MotionGenesisRunState {
  id: string;
  scenePath: string;
  sceneFilePath: string;
  simulationSettings: string;
  command: string;
  commandLine: string;
  commandSource: string;
  workingDirectory: string;
  workspaceRoot: string;
  pid: number | null;
  status: MotionGenesisRunStatus;
  output: string;
  exitCode: number | null;
  startedAt: string;
  endedAt: string | null;
  canSendInput: boolean;
  options: MotionGenesisRunOptions;
}
