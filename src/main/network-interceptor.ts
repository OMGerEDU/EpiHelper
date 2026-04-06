import type { Session } from 'electron';

// 1x1 transparent GIF — served in place of animated GIFs when blocking is enabled
const STATIC_GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI=';

type SiteWhitelistFn = (url: string) => boolean;
type GifBlockingEnabledFn = () => boolean;

export function setupNetworkInterceptor(
  targetSession: Session,
  isGifBlockingEnabled: GifBlockingEnabledFn,
  isWhitelisted: SiteWhitelistFn,
): void {
  const hookedSessions = (setupNetworkInterceptor as typeof setupNetworkInterceptor & {
    __hookedSessions__?: WeakSet<Session>;
  }).__hookedSessions__ ?? new WeakSet<Session>();

  (setupNetworkInterceptor as typeof setupNetworkInterceptor & {
    __hookedSessions__?: WeakSet<Session>;
  }).__hookedSessions__ = hookedSessions;

  if (hookedSessions.has(targetSession)) {
    return;
  }

  hookedSessions.add(targetSession);

  targetSession.webRequest.onBeforeRequest(
    { urls: ['*://*/*'] },
    (details, callback) => {
      // Skip entirely if GIF blocking is turned off in settings
      if (!isGifBlockingEnabled()) {
        callback({});
        return;
      }

      const url = details.url.toLowerCase();

      const isGif =
        (details.resourceType === 'image' && url.includes('.gif')) ||
        url.endsWith('.gif');

      if (isGif && !isWhitelisted(details.url)) {
        callback({ redirectURL: STATIC_GIF });
        return;
      }

      callback({});
    }
  );
}
