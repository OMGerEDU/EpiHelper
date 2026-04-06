import type { OnHeadersReceivedListenerDetails, Session } from 'electron';

// 1x1 transparent GIF — served in place of animated GIFs when blocking is enabled
const TRANSPARENT_GIF_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const configuredSessions = new WeakSet<Session>();

function getPathname(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function isGifRequest(url: string): boolean {
  return getPathname(url).endsWith('.gif');
}

function isWebpCandidate(url: string): boolean {
  return url.toLowerCase().includes('.webp');
}

function getContentType(details: OnHeadersReceivedListenerDetails): string {
  const contentTypeEntry = Object.entries(details.responseHeaders ?? {}).find(([headerName]) => {
    return headerName.toLowerCase() === 'content-type';
  });

  if (!contentTypeEntry) {
    return '';
  }

  return contentTypeEntry[1]?.[0]?.toLowerCase() ?? '';
}

export function setupNetworkInterceptor(tabSession: Session): void {
  if (configuredSessions.has(tabSession)) {
    return;
  }

  configuredSessions.add(tabSession);

  tabSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (isGifRequest(details.url)) {
      callback({ redirectURL: TRANSPARENT_GIF_DATA_URL });
      return;
    }

    callback({});
  });

  tabSession.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    if (isWebpCandidate(details.url) && getContentType(details).includes('image/webp')) {
      callback({ cancel: true });
      return;
    }

    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });
}
