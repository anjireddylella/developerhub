import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

export default function ApiIndexPage({data}) {
  return (
    <Layout title="APIs" description="Curated summaries of selected SP-API snapshots">
      <main className={`container margin-vert--lg ${styles.page}`}>
        <Heading as="h1">Explore APIs</Heading>
        <p>
          Browse bounded summaries generated from pinned local model snapshots. GitHub remains the
          source of truth for the complete files.
        </p>
        <ul className={styles.cardGrid}>
          {data.apis.map((api) => (
            <li key={api.slug}>
              <Link className={`card ${styles.card}`} to={`/apis/${api.slug}`}>
                <div className="card__header">
                  <Heading as="h2">{api.title}</Heading>
                </div>
                <div className="card__body">
                  <p>{api.summary}</p>
                  <dl className={styles.compactMetadata}>
                    <div><dt>Version</dt><dd>{api.version}</dd></div>
                    <div><dt>Operations</dt><dd>{api.operationCount}</dd></div>
                    <div><dt>Recipe excerpts</dt><dd>{api.recipeCount}</dd></div>
                    <div><dt>Samples</dt><dd>{api.sampleCount}</dd></div>
                  </dl>
                  <p className={styles.scope}>Applicability not established by this demo snapshot.</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
}
