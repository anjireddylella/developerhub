import React from 'react';
import styles from './styles.module.css';

const SECTIONS = [
  ['overview', 'Overview'],
  ['api-model', 'API model'],
  ['code-recipes', 'Code recipes'],
  ['samples', 'Samples'],
  ['hot-topics', 'Hot topics'],
  ['questions', 'Questions'],
];

export default function SectionNav() {
  return (
    <nav aria-label="On this page" className={styles.sectionNav}>
      <strong>On this page</strong>
      {SECTIONS.map(([id, label]) => <a data-analytics-id="api-section" key={id} href={`#${id}`}>{label}</a>)}
    </nav>
  );
}
