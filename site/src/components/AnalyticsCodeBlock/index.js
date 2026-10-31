import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import {CodeAnalyticsContext, validateCodeAnalytics} from './context.js';

export default function AnalyticsCodeBlock({codeId, language, children}) {
  const analytics = validateCodeAnalytics(codeId, language);
  return (
    <CodeAnalyticsContext.Provider value={analytics}>
      <CodeBlock language={language}>{children}</CodeBlock>
    </CodeAnalyticsContext.Provider>
  );
}
