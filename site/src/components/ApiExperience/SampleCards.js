import React from 'react';
import styles from './styles.module.css';

export default function SampleCards({samples, emptyMessage}) {
  return (
    <section aria-labelledby="samples">
      <h2 id="samples">Samples</h2>
      {samples.length === 0 ? <p className={styles.emptyState}>{emptyMessage}</p> : (
        <ul className={styles.cardGrid}>
          {samples.map((sample) => (
            <li key={sample.id} className={`card ${styles.card}`}>
              <div className="card__header"><h3>{sample.title}</h3></div>
              <div className="card__body">
                <p>{sample.description}</p>
                <p><strong>Languages:</strong> {sample.languages.join(', ')}</p>
                <p><strong>Sample applicability:</strong> {sample.applicability}</p>
                <p>{sample.warning}</p>
                <p><strong>Pinned source:</strong> <code>{sample.localPath}</code></p>
                <p><a href={sample.sourceUrl} data-analytics-destination="samples_source">View pinned sample folder</a> · <a href={sample.readmeUrl} data-analytics-destination="samples_source">View README</a></p>
                {sample.documentation.map((document) => <p key={document.url}><a href={document.url} data-analytics-destination="samples_source">{document.label}</a></p>)}
                <p><a href="/licenses/selling-partner-api-samples/license" data-analytics-id="api-local-license">Sample code license</a> · <a href={sample.licenseUrl} data-analytics-destination="samples_source">Pinned upstream license</a></p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
