import React from 'react';
import CodeBlock from '@theme/CodeBlock';

export default function AnalyticsCodeBlock({language, children}) {
  return <CodeBlock language={language}>{children}</CodeBlock>;
}
