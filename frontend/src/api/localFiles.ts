import { isStaticHosting } from './runtimeMode.ts';

export type { FileBrowserEntry, FileBrowserListing } from './localFilesTypes.ts';
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
