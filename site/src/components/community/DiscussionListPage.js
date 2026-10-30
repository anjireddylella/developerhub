import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {EVENTS, track} from '@site/src/lib/analytics';
import {SampleDataNotice, PrivacyNotice, Labels, formatDate} from './shared';
import styles from './styles.module.css';

export default function DiscussionListPage({data}) {
  const {section, items, source} = data;

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
            onClick={() => track(EVENTS.communityAction, {action: 'new', section: section.key})}>
            {section.newLabel}
            <span className="sr-only"> (opens GitHub in a new tab)</span>
          </a>
        </div>

        <PrivacyNotice />
        {source === 'sample' && <SampleDataNotice />}

        {items.length === 0 ? (
          <p>Nothing here yet. Be the first to post.</p>
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
                  <Link to={`${section.basePath}/${item.number}`} className={styles.title}>
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
