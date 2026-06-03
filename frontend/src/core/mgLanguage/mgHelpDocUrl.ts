import { getPublicBaseUrl } from '../../api/assetPaths.ts';
import { isStaticHosting } from '../../api/runtimeMode.ts';

const API_MG_HELP_PATH = '/mgview/api/mg-help';
const MG_HELP_ANCHOR_PREFIX = '#';

export function getMgHelpTopicAnchor(topicId: string): string {
  return `${MG_HELP_ANCHOR_PREFIX}${encodeURIComponent(topicId)}`;
}

/**
 * Same-origin URL for MotionGenesisHelp.html (server API in local mode, bundled copy on static hosting).
 */
export function getMgHelpPageUrl(topicId?: string): string {
  const base = isStaticHosting
    ? new URL('mg-help/MotionGenesisHelp.html', new URL(getPublicBaseUrl(), window.location.origin)).toString()
    : new URL(API_MG_HELP_PATH, window.location.origin).toString();
  if (!topicId) {
    return base;
  }
  return `${base}${getMgHelpTopicAnchor(topicId)}`;
}
