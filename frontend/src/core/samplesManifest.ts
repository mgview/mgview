import manifest from '../../../samples-manifest.json' with { type: 'json' };

import { resolvePublicAssetUrl } from '../api/assetPaths.ts';
import type { SceneRef } from './sceneRef.ts';
import { createSampleRef, DEFAULT_SAMPLE_SCENE_PATH } from './sceneRef.ts';

export interface SampleSceneEntry {
  group: string;
  label: string;
  path: string;
  thumbnail?: string;
}

export interface SamplesManifest {
  version: number;
  scenes: SampleSceneEntry[];
}

const samplesManifest = manifest as SamplesManifest;

export function getSamplesManifest(): SamplesManifest {
  return samplesManifest;
}

export function getDefaultSampleSceneRef(): SceneRef {
  const hasDefault = samplesManifest.scenes.some((entry) => entry.path === DEFAULT_SAMPLE_SCENE_PATH);
  const path = hasDefault
    ? DEFAULT_SAMPLE_SCENE_PATH
    : (samplesManifest.scenes[0]?.path ?? DEFAULT_SAMPLE_SCENE_PATH);
  return createSampleRef(path);
}

/** Relative path under samples/ for a scene preview image. */
export function getSampleThumbnailRelativePath(entry: SampleSceneEntry): string {
  if (entry.thumbnail) {
    return entry.thumbnail;
  }

  const slashIndex = entry.path.lastIndexOf('/');
  const directory = slashIndex >= 0 ? entry.path.slice(0, slashIndex) : '';
  return directory.length > 0 ? `${directory}/preview.webp` : 'preview.webp';
}

export function resolveSampleThumbnailUrl(entry: SampleSceneEntry): string {
  return resolvePublicAssetUrl(`samples/${getSampleThumbnailRelativePath(entry)}`);
}

export function groupSampleScenes(): Array<[string, SampleSceneEntry[]]> {
  const groups = new Map<string, SampleSceneEntry[]>();

  for (const entry of samplesManifest.scenes) {
    const group = groups.get(entry.group) ?? [];
    group.push(entry);
    groups.set(entry.group, group);
  }

  return [...groups.entries()];
}
