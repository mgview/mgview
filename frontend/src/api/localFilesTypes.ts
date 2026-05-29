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
