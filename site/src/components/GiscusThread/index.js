import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useColorMode} from '@docusaurus/theme-common';

// Embeds one existing GitHub Discussion (by number) so developers can reply,
// react, and vote without leaving the hub. Giscus handles GitHub sign-in.
function Thread({number}) {
  const {siteConfig} = useDocusaurusContext();
  const {colorMode} = useColorMode();
  const {github, giscus} = siteConfig.customFields;
  // Loaded lazily: @giscus/react registers a web component, which needs a browser.
  const Giscus = require('@giscus/react').default;

  return (
    <Giscus
      repo={`${github.owner}/${github.name}`}
      repoId={giscus.repoId}
      mapping="number"
      term={String(number)}
      strict="1"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={colorMode === 'dark' ? 'dark' : 'light'}
      lang="en"
      loading="lazy"
    />
  );
}

export default function GiscusThread({number, url, section}) {
  const {siteConfig} = useDocusaurusContext();
  if (!siteConfig.customFields.giscus?.repoId) {
    return (
      <div className="alert alert--info" role="note">
        Replies and voting appear here once Giscus is configured (set <code>GISCUS_REPO_ID</code>).
        Until then, view this thread on <a href={url} data-analytics-destination="developer_hub_discussion" data-community-action="open_discussion" data-community-section={section}>GitHub</a>.
      </div>
    );
  }
  return <BrowserOnly fallback={<p>Loading replies…</p>}>{() => <Thread number={number} />}</BrowserOnly>;
}
