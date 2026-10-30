// Loads CloudWatch RUM in the browser and records:
//   - page views on every client-side route change
//   - clicks on links that leave the hub (where developers go next)
//
// Cookies are off by default. Turn them on with the consent tool once the
// cookie-consent decision is made (see README "Analytics and consent").

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import siteConfig from '@generated/docusaurus.config';
import {EVENTS, getRumClient, setRumClient, track} from '../lib/analytics';

const rumConfig = siteConfig.customFields?.rum ?? {};
const enabled = Boolean(rumConfig.appMonitorId && rumConfig.identityPoolId);

if (ExecutionEnvironment.canUseDOM) {
  if (enabled) {
    import('aws-rum-web')
      .then(({AwsRum}) => {
        const client = new AwsRum(rumConfig.appMonitorId, '0.1.0', rumConfig.region, {
          identityPoolId: rumConfig.identityPoolId,
          endpoint: `https://dataplane.rum.${rumConfig.region}.amazonaws.com`,
          sessionSampleRate: rumConfig.sessionSampleRate,
          telemetries: ['performance', 'errors'],
          allowCookies: false,
          enableXRay: false,
          // We record page views ourselves so SPA navigation is counted.
          disableAutoPageView: true,
        });
        setRumClient(client);
        client.recordPageView(window.location.pathname);
      })
      .catch((err) => {
        // Analytics must never break the site.
        // eslint-disable-next-line no-console
        console.warn('[analytics] RUM failed to load', err);
      });
  }

  document.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link) return;
      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin === window.location.origin) return;
      track(EVENTS.outboundClick, {
        destination: `${url.origin}${url.pathname}`, // no query string
        fromPage: window.location.pathname,
        label: (link.textContent || '').trim().slice(0, 80),
      });
    },
    {capture: true},
  );
}

export function onRouteDidUpdate({location, previousLocation}) {
  if (!previousLocation || location.pathname === previousLocation.pathname) return;
  getRumClient()?.recordPageView(location.pathname);
}
