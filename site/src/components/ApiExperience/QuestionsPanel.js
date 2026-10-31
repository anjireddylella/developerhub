import React from 'react';
import Link from '@docusaurus/Link';

export default function QuestionsPanel({questions}) {
  return (
    <section aria-labelledby="questions">
      <h2 id="questions">Questions</h2>
      <p>Search existing community questions first, then ask on GitHub if you need more help.</p>
      <p><Link to={questions.hubUrl}>Browse questions in Developer Hub</Link></p>
      {questions.discussionUrl && <p><a href={questions.discussionUrl}>{questions.discussionLabel}</a></p>}
      <p><a href={questions.askUrl}>Ask on GitHub</a></p>
    </section>
  );
}
