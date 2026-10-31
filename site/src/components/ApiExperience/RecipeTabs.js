import React from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import AnalyticsCodeBlock from '@site/src/components/AnalyticsCodeBlock';
import styles from './styles.module.css';

function Recipe({entry}) {
  return (
    <div>
      <p className={styles.excerptLabel}>Exact excerpt from the pinned source.</p>
      <AnalyticsCodeBlock language={entry.language}>{entry.excerpt}</AnalyticsCodeBlock>
      <p>
        Source commit <code>{entry.commit}</code>, path <code>{entry.sourcePath}</code>.{' '}
        <a href={entry.sourceUrl}>View exact original file</a> for imports and omitted setup.{' '}
        <a href={entry.licenseRoute}>Local sample code license</a> ·{' '}
        <a href={entry.licenseUrl}>Pinned upstream license</a>.
      </p>
      {entry.note && <p>{entry.note}</p>}
    </div>
  );
}

export default function RecipeTabs({groups, emptyMessage}) {
  return (
    <section aria-labelledby="code-recipes">
      <h2 id="code-recipes">Code recipes</h2>
      {groups.length === 0 ? <p className={styles.emptyState}>{emptyMessage}</p> : groups.map((group) => (
        <article key={group.id} className={styles.recipe}>
          <h3>{group.title}</h3>
          <p>{group.description}</p>
          {group.legacy && <div className="alert alert--warning" role="note">Legacy version: this recipe is not code for the displayed model version.</div>}
          {group.entries.length === 1 ? <Recipe entry={group.entries[0]} /> : (
            <Tabs groupId={group.id}>
              {group.entries.map((entry) => (
                <TabItem key={entry.language} value={entry.language} label={entry.language === 'php' ? 'PHP' : entry.language[0].toUpperCase() + entry.language.slice(1)}>
                  <Recipe entry={entry} />
                </TabItem>
              ))}
            </Tabs>
          )}
        </article>
      ))}
    </section>
  );
}
