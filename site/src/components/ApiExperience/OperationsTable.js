import React from 'react';
import styles from './styles.module.css';

export default function OperationsTable({operations, authorization}) {
  return (
    <section aria-labelledby="operations-heading">
      <h2 id="operations-heading">Operations and authorization</h2>
      <p>{authorization.text}</p>
      <p>
        <a href={authorization.connectingGuide}>Connecting to the Selling Partner API</a>
      </p>
      <div className={styles.tableScroll} role="region" aria-label="Selected operations" tabIndex="0">
        <table>
          <caption>Operations selected from this demo snapshot</caption>
          <thead><tr><th scope="col">Operation</th><th scope="col">Method</th><th scope="col">Path</th><th scope="col">Purpose</th></tr></thead>
          <tbody>
            {operations.map((operation) => (
              <tr key={operation.operationId}>
                <th scope="row"><code>{operation.operationId}</code></th>
                <td><span className={styles.method}>{operation.method}</span></td>
                <td><code>{operation.path}</code></td>
                <td>{operation.summary || operation.description || 'No description in the pinned model.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
