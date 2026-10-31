import React from 'react';
import Link from '@docusaurus/Link';

export default function QuestionsPanel({questions}) {
  return (
    <section aria-labelledby="questions">
      <h2 id="questions">Questions</h2>
      <p>Search existing community questions first, then ask on GitHub if you need more help.</p>
      <p><Link data-analytics-id="search-community" to={questions.hubUrl}>Browse questions in Developer Hub</Link></p>
      {questions.discussionUrl && (
        <p>
          <a
            href={questions.discussionUrl}
            data-analytics-destination="developer_hub_discussion"
            data-community-action="open_discussion"
            data-community-section="hot_topics">
            {questions.discussionLabel}
          </a>
        </p>
      )}
      <p>
        <a
          href={questions.askUrl}
          data-analytics-destination="developer_hub_discussion"
          data-community-action="ask_question"
          data-community-section="questions">
          Ask on GitHub
        </a>
      </p>
    </section>
  );
}
