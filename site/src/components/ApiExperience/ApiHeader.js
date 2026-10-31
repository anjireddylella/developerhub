import React from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

export default function ApiHeader({api}) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link to="/apis">APIs</Link> <span aria-hidden="true">/</span> <span>{api.title}</span>
      </nav>
      <Heading as="h1">{api.title}</Heading>
      <p className={styles.summary}>{api.summary}</p>
      <dl className={styles.metadata}>
        <div><dt>Status</dt><dd><span className="badge badge--info">{api.status}</span></dd></div>
        <div><dt>Version</dt><dd>{api.version}</dd></div>
        <div><dt>API applicability</dt><dd>Unknown</dd></div>
        <div>
          <dt>Source commit</dt>
          <dd>
            <a href={api.model.commitUrl} title={api.model.commit}>
              <span aria-hidden="true">{api.model.commit.slice(0, 12)}</span>
              <span className="sr-only">{api.model.commit}</span>
            </a>
          </dd>
        </div>
      </dl>
      <p className={styles.scope}>Applicability not established by this demo snapshot.</p>
    </header>
  );
}
