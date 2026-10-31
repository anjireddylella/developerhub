import React from 'react';
import styles from './styles.module.css';

export default function SourceAttribution({api}) {
  return (
    <aside className={styles.attribution} aria-label="Source attribution">
      <strong>Source attribution</strong>
      <p>
        This page is a generated summary of selected content owned by the source repositories. It
        uses the pinned model at commit <code>{api.model.commit}</code>; the full original remains
        authoritative.
      </p>
      <ul>
        <li><a href={api.model.sourceUrl}>View exact original file</a></li>
        <li><a href={api.model.commitUrl}>View at pinned commit</a></li>
        <li><a href={api.model.historyUrl}>View live file history</a></li>
        <li><a href={api.model.licenseRoutes[0]}>Model license</a></li>
        <li><a href={api.model.licenseRoutes[1]}>Model NOTICE</a></li>
        <li><a href={api.model.licenseSourceUrls[0]}>Pinned upstream license</a></li>
        <li><a href={api.model.licenseSourceUrls[1]}>Pinned upstream NOTICE</a></li>
      </ul>
    </aside>
  );
}
