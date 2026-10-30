import React from 'react';
import styles from './styles.module.css';

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric'});
}

export function Labels({labels = []}) {
  return labels.map((l) => (
    <span key={l.name} className={styles.label} style={{borderColor: `#${l.color}`}}>
      {l.name}
    </span>
  ));
}

export function PrivacyNotice() {
  return (
    <div className="alert alert--warning margin-bottom--md" role="note">
      Posts are public. Do not include seller IDs, order IDs, customer data, access tokens, or
      client secrets.
    </div>
  );
}

export function SampleDataNotice() {
  return (
    <div className="alert alert--secondary margin-bottom--md" role="note">
      Showing sample discussions. Set <code>HUB_GITHUB_TOKEN</code> at build time to load live
      GitHub Discussions.
    </div>
  );
}
