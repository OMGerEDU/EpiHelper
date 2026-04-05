import { session } from 'electron';

// 1x1 transparent GIF — served in place of animated GIFs when blocking is enabled
const STATIC_GIF = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI=';

type SiteWhitelistFn = (url: string) => boolean;

export function setupNetworkInterceptor(isWhitelisted: SiteWhitelistFn): void {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const url = details.url.toLowerCase();

      // Block animated GIFs for non-whitelisted sites
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
