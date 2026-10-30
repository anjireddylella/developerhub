import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import GiscusThread from '@site/src/components/GiscusThread';
import {SampleDataNotice, PrivacyNotice, Labels, formatDate} from './shared';
import styles from './styles.module.css';

export default function DiscussionPage({data}) {
  const {section, item, source} = data;

  return (
    <Layout title={item.title} description={`${section.title}: ${item.title}`}>
      <main className="container container--fluid margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <nav aria-label="Breadcrumb" className="margin-bottom--md">
              <Link to={section.basePath}>← All {section.title.toLowerCase()}</Link>
            </nav>

            {source === 'sample' && <SampleDataNotice />}

            <article>
              <h1>{item.title}</h1>
              <div className={styles.meta}>
                {item.isAnswered && <span className="badge badge--success">Answered</span>}
                {item.locked && <span className="badge badge--secondary">Locked</span>}
                <Labels labels={item.labels} />
                <span>
                  {item.author?.login ?? 'unknown'} · posted {formatDate(item.createdAt)}
                </span>
              </div>
              {/* bodyHTML is rendered and sanitized by GitHub. Rendering it here
                  keeps the question in the page HTML so search engines index it. */}
              <div className={styles.body} dangerouslySetInnerHTML={{__html: item.bodyHTML}} />
            </article>

            <PrivacyNotice />

            <section aria-label="Replies" className="margin-top--lg">
              <GiscusThread number={item.number} url={item.url} />
            </section>
          </div>
        </div>
      </main>
    </Layout>
  );
}
