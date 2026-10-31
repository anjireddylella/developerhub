import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {SampleDataNotice, PrivacyNotice, Labels, formatDate} from './shared';
import styles from './styles.module.css';

export default function DiscussionListPage({data}) {
  const {section, items, source} = data;
  const newAction = section.key === 'questions' ? 'ask_question' : 'submit_idea';

  return (
    <Layout title={section.title} description={section.description}>
      <main className="container margin-vert--lg">
        <div className={styles.header}>
          <div>
            <h1>{section.title}</h1>
            <p>{section.description}</p>
          </div>
          <a
            className="button button--primary"
            href={section.newUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-destination="developer_hub_discussion"
            data-community-action={newAction}
            data-community-section={section.key}>
            {section.newLabel}
            <span className="sr-only"> (opens GitHub in a new tab)</span>
          </a>
        </div>

        <PrivacyNotice />
        {source === 'sample' && <SampleDataNotice />}
        {section.unavailableCount > 0 && (
          <div className="alert alert--secondary margin-bottom--md" role="status">
            {section.unavailableCount}{' '}
            {section.unavailableCount === 1 ? 'discussion could' : 'discussions could'} not be
            displayed.{' '}
            <a
              href={section.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-destination="developer_hub_discussion"
              data-community-action="open_discussion"
              data-community-section={section.key}>
              Open discussions on GitHub
              <span className="sr-only"> (opens GitHub in a new tab)</span>
            </a>
          </div>
        )}

        {items.length === 0 ? (
          <p>No discussions are currently available.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.number} className={styles.row}>
                <div className={styles.stat} aria-label={`${item.votes} votes`}>
                  <strong>{item.votes}</strong>
                  <span>votes</span>
                </div>
                <div className={styles.stat} aria-label={`${item.replies} replies`}>
                  <strong>{item.replies}</strong>
                  <span>replies</span>
                </div>
                <div className={styles.main}>
                  <Link data-analytics-id="community-item" to={`${section.basePath}/${item.number}`} className={styles.title}>
                    {item.title}
                  </Link>
                  <div className={styles.meta}>
                    {item.isAnswered && <span className="badge badge--success">Answered</span>}
                    <Labels labels={item.labels} />
                    <span>
                      {item.author?.login ?? 'unknown'} · updated {formatDate(item.updatedAt)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Layout>
  );
}
