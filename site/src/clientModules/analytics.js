// Records bounded page views and explicitly identified navigation actions.
// CloudWatch RUM remains off unless privacy approval and both public IDs are
// deliberately configured. Site interactions never depend on the transport.

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import siteConfig from '@generated/docusaurus.config';
import {
  EVENTS,
  recordPageView,
  setRumClient,
  track,
  trackInternalNavigation,
} from '../lib/analytics';

const rumConfig = siteConfig.customFields?.rum ?? {};
const enabled = Boolean(
  rumConfig.privacyApproved === true &&
  rumConfig.appMonitorId &&
  rumConfig.identityPoolId,
);

function startRum() {
  if (!enabled) return;
  import('aws-rum-web')
    .then(({AwsRum}) => {
      const client = new AwsRum(rumConfig.appMonitorId, '0.1.0', rumConfig.region, {
        identityPoolId: rumConfig.identityPoolId,
        endpoint: `https://dataplane.rum.${rumConfig.region}.amazonaws.com`,
        sessionSampleRate: rumConfig.sessionSampleRate,
        telemetries: [],
        allowCookies: false,
        enableXRay: false,
        disableAutoPageView: true,
      });
      setRumClient(client);
    })
    .catch(() => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[analytics] Analytics transport is unavailable.');
      }
    });
}

function trackIdentifiedClick(event) {
  if (!(event.target instanceof Element) || (typeof event.button === 'number' && event.button !== 0)) return;
  const link = event.target.closest('a[href]');
  if (!link) return;
  let target;
  try {
    target = new URL(link.href, window.location.href);
  } catch {
    return;
  }

  const action = link.dataset.communityAction;
  const section = link.dataset.communitySection;
  if (action && section) track(EVENTS.communityAction, {action, section});

  if (target.origin === window.location.origin) {
    const navigationId = link.dataset.analyticsId;
    if (navigationId) {
      trackInternalNavigation(navigationId, target.pathname, window.location.pathname);
    }
    return;
  }

  const destinationType = link.dataset.analyticsDestination;
  if (!destinationType) return;
  const resourceId = link.dataset.analyticsResourceId;
  track(EVENTS.outboundClick, {
    destinationType,
    ...(resourceId ? {resourceId} : {}),
  });
}

if (ExecutionEnvironment.canUseDOM) {
  recordPageView(window.location.pathname);
  startRum();
  document.addEventListener('click', trackIdentifiedClick, {capture: true});
}

export function onRouteDidUpdate({location, previousLocation}) {
  if (!previousLocation || location.pathname === previousLocation.pathname) return;
  recordPageView(location.pathname);
}
