import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function RelatedTopics({topics, emptyMessage}) {
  return (
    <section aria-labelledby="hot-topics">
      <h2 id="hot-topics">Hot topics</h2>
      {topics.length === 0 ? <p className={styles.emptyState}>{emptyMessage}</p> : (
        <ul>{topics.map((topic) => <li key={topic.route}><Link data-analytics-id="api-related-topic" to={topic.route}>{topic.title}</Link>: {topic.description}</li>)}</ul>
      )}
    </section>
  );
}
