import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

export default function LicensePage({data}) {
  return (
    <Layout title={data.title} description={`Exact license material from ${data.repositoryUrl}`}>
      <main className={`container margin-vert--lg ${styles.page}`}>
        <Heading as="h1">{data.title}</Heading>
        <p>
          Exact text from the pinned source at <code>{data.commit}</code>.{' '}
          <a href={data.sourceUrl}>View the original file</a>.
        </p>
        <pre className={styles.licenseText}>{data.text}</pre>
      </main>
    </Layout>
  );
}
