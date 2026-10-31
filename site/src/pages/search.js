import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './search.module.css';

const SHORTCUTS = [
  {title: 'Explore APIs', route: '/apis'},
  {title: 'Start here', route: '/docs/intro'},
  {title: 'Hot topics', route: '/blog'},
  {title: 'Questions', route: '/community/questions'},
  {title: 'Resources', route: '/resources'},
];

function communityRecords(community) {
  return (community?.communitySearch || []).map((item) => {
    const contentType = item.section === 'questions' ? 'question' : 'idea';
    return {
      id: `${contentType}/${item.number}`,
      title: item.title,
      summary: `Community ${contentType} stored in GitHub Discussions.`,
      route: item.route,
      apiFamily: 'cross-cutting',
      language: 'none',
      contentType,
      labels: item.labels,
    };
  });
}

function rank(record, query) {
  const title = record.title.toLocaleLowerCase();
  const haystack = [
    record.title,
    record.summary,
    record.apiFamily,
    record.language,
    record.contentType,
    ...record.labels,
  ].join(' ').toLocaleLowerCase();
  if (title.startsWith(query)) return 0;
  if (title.includes(query)) return 1;
  if (haystack.includes(query)) return 2;
  return -1;
}

export default function SearchPage() {
  const apiContent = usePluginData('api-content');
  const community = usePluginData('hub-community');
  const [query, setQuery] = useState('');
  const [truncated, setTruncated] = useState(false);
  const normalized = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const records = useMemo(
    () => [...apiContent.records, ...communityRecords(community)],
    [apiContent.records, community],
  );
  const results = useMemo(() => {
    if (!normalized) return [];
    return records
      .map((record) => ({record, score: rank(record, normalized)}))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => a.score - b.score || a.record.title.localeCompare(b.record.title))
      .slice(0, 50)
      .map((entry) => entry.record);
  }, [normalized, records]);

  const status = truncated
    ? `Search limited to 200 characters. ${results.length} results.`
    : normalized
      ? results.length === 0 ? 'No results.' : `${results.length} results.`
      : 'Enter a search term or choose a shortcut.';

  const updateQuery = (event) => {
    const value = event.target.value;
    setTruncated(value.length > 200);
    setQuery(value.slice(0, 200));
  };

  return (
    <Layout title="Search" description="Search Developer Hub APIs, guides, topics, resources, and community titles">
      <main className={`container margin-vert--lg ${styles.page}`}>
        <Heading as="h1">Search Developer Hub</Heading>
        <p>Search curated metadata. Code, model bodies, Discussion bodies, and your search text are not indexed or sent anywhere.</p>
        <div className={styles.searchControl}>
          <label htmlFor="hub-search">Search APIs, guides, topics, resources, and community titles</label>
          <input id="hub-search" type="search" value={query} onChange={updateQuery} autoComplete="off" />
        </div>
        <p role="status" aria-live="polite" className={styles.status}>{status}</p>

        {!normalized && (
          <section aria-labelledby="search-shortcuts">
            <Heading as="h2" id="search-shortcuts">Browse by section</Heading>
            <ul className={styles.shortcuts}>
              {SHORTCUTS.map((shortcut) => <li key={shortcut.route}><Link data-analytics-id="search-shortcut" to={shortcut.route}>{shortcut.title}</Link></li>)}
            </ul>
          </section>
        )}

        {normalized && results.length > 0 && (
          <ul className={styles.results}>
            {results.map((result) => (
              <li key={result.id}>
                <Link data-analytics-id="search-result" to={result.route}><strong>{result.title}</strong></Link>
                <p>{result.summary}</p>
                <small>{result.contentType.replace('_', ' ')} · {result.apiFamily}</small>
              </li>
            ))}
          </ul>
        )}

        {normalized && results.length === 0 && (
          <section aria-labelledby="no-results">
            <Heading as="h2" id="no-results">No results</Heading>
            <p><Link data-analytics-id="search-community" to="/community/questions">Browse community questions</Link> or <a href="https://github.com/anjireddylella/developerhub/discussions/new?category=q-a" data-analytics-destination="developer_hub_discussion" data-community-action="ask_question" data-community-section="questions">ask on GitHub</a>.</p>
          </section>
        )}
      </main>
    </Layout>
  );
}
