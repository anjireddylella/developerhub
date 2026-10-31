import React from 'react';
import AnalyticsCodeBlock from '@site/src/components/AnalyticsCodeBlock';

export default function ModelExcerpt({model}) {
  return (
    <section aria-labelledby="api-model">
      <h2 id="api-model">API model</h2>
      <p>
        Generated summary of selected operations from the pinned model; descriptions may be
        shortened; bodies, schemas, examples, definitions, and unselected operations are omitted.
      </p>
      <p><a href={model.sourceUrl} data-analytics-destination="models_source">View exact original file</a> · <a href={model.commitUrl} data-analytics-destination="models_source">View at pinned commit</a></p>
      <AnalyticsCodeBlock codeId={model.codeId} language="json">
        {JSON.stringify(model.projection, null, 2)}
      </AnalyticsCodeBlock>
    </section>
  );
}
