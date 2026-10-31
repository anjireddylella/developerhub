import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import RESOURCES from '@site/src/data/resources';

export default function Resources() {
  return (
    <Layout title="Resources" description="Every official SP-API resource in one list">
      <main className="container margin-vert--lg">
        <Heading as="h1">Resources</Heading>
        <p>Official SP-API resources in one place. Links open the source site.</p>
        {RESOURCES.map((group) => (
          <section key={group.group} className="margin-top--lg">
            <Heading as="h2">{group.group}</Heading>
            <ul>
              {group.items.map((r) => (
                <li key={r.id} id={r.id}>
                  <a href={r.href}>{r.title}</a>: {r.description}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </Layout>
  );
}
