export interface MotionGenesisCandidate {
  path: string;
  exists: boolean;
}

export interface MotionGenesisPtyLoadAttempt {
  path: string;
  ok: boolean;
  error: string | null;
}

export interface MotionGenesisRuntimeInfo {
  command: string;
  source: string;
  exists: boolean;
  configuredPath: string | null;
  candidates: MotionGenesisCandidate[];
  nodeVersion: string;
  requiredModule: string;
  resolvedModulePath: string | null;
  loadAttempts: MotionGenesisPtyLoadAttempt[];
  ptyAvailable: boolean;
  ptyError: string | null;
}
