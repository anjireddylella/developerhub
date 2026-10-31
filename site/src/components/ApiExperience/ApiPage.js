import React from 'react';
import Layout from '@theme/Layout';
import ApiHeader from './ApiHeader';
import SectionNav from './SectionNav';
import OperationsTable from './OperationsTable';
import ModelExcerpt from './ModelExcerpt';
import RecipeTabs from './RecipeTabs';
import SampleCards from './SampleCards';
import RelatedTopics from './RelatedTopics';
import QuestionsPanel from './QuestionsPanel';
import SourceAttribution from './SourceAttribution';
import Helpful from '@site/src/components/Helpful';
import styles from './styles.module.css';

export default function ApiPage({data: api}) {
  return (
    <Layout title={api.title} description={api.summary}>
      <main className={`container margin-vert--lg ${styles.page}`}>
        <ApiHeader api={api} />
        <SourceAttribution api={api} />
        <SectionNav />
        <section aria-labelledby="overview">
          <h2 id="overview">Overview</h2>
          <p>{api.summary}</p>
          <p><a href={api.guideUrl}>Read the official API guide</a></p>
        </section>
        <OperationsTable operations={api.model.projection.operations} authorization={api.authorization} />
        <ModelExcerpt model={api.model} />
        <RecipeTabs groups={api.recipeGroups} emptyMessage={api.recipesEmpty} />
        <SampleCards samples={api.samples} emptyMessage={api.samplesEmpty} />
        <RelatedTopics topics={api.topics} emptyMessage={api.topicsEmpty} />
        <QuestionsPanel questions={api.questions} />
        <Helpful contentType="api" />
      </main>
    </Layout>
  );
}
