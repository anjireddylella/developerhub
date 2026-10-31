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
        <li><a href={api.model.sourceUrl} data-analytics-destination="models_source">View exact original file</a></li>
        <li><a href={api.model.commitUrl} data-analytics-destination="models_source">View at pinned commit</a></li>
        <li><a href={api.model.historyUrl} data-analytics-destination="models_source">View live file history</a></li>
        <li><a href={api.model.licenseRoutes[0]} data-analytics-id="api-local-license">Model license</a></li>
        <li><a href={api.model.licenseRoutes[1]} data-analytics-id="api-local-license">Model NOTICE</a></li>
        <li><a href={api.model.licenseSourceUrls[0]} data-analytics-destination="models_source">Pinned upstream license</a></li>
        <li><a href={api.model.licenseSourceUrls[1]} data-analytics-destination="models_source">Pinned upstream NOTICE</a></li>
      </ul>
    </aside>
  );
}
