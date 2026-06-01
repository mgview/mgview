import { isStaticHosting } from './runtimeMode.ts';

export type { FileBrowserEntry, FileBrowserListing } from './localFilesTypes.ts';
export type { WorkspaceInfo } from './workspaceTypes.ts';
export {
  getPublicBaseUrl,
  getServerRootPrefix,
  resolveAppAssetUrl,
  resolveBundledAssetUrl,
  resolvePublicAssetUrl,
} from './assetPaths.ts';
export { canPersistScenesToServer, isStaticHosting } from './runtimeMode.ts';

import * as localFilesServer from './localFilesServer.ts';
import * as localFilesStatic from './localFilesStatic.ts';

const impl = isStaticHosting ? localFilesStatic : localFilesServer;

export const listLocalFiles = impl.listLocalFiles;
export const loadSceneJson = impl.loadSceneJson;
export const loadTextFile = impl.loadTextFile;
export const saveSceneJson = impl.saveSceneJson;
export const createSceneJson = impl.createSceneJson;
export const createWorkspaceDirectory = isStaticHosting
  ? () => {
      throw new Error('Workspace folders can only be created with the local MGView server.');
    }
  : localFilesServer.createWorkspaceDirectory;

const staticWorkspaceUnavailable = () => {
  throw new Error('Workspace settings are only available with the local MGView server.');
};

export const getWorkspaceInfo = isStaticHosting ? staticWorkspaceUnavailable : localFilesServer.getWorkspaceInfo;
export const setWorkspaceRoot = isStaticHosting ? staticWorkspaceUnavailable : localFilesServer.setWorkspaceRoot;
