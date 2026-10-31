import React, {useState} from 'react';
import {EVENTS, track} from '@site/src/lib/analytics';
import styles from './styles.module.css';

// Feedback acknowledgement is local UI state. Analytics is optional and can
// never prevent a visitor from completing the action.
export default function Helpful() {
  const [vote, setVote] = useState(null);

  const send = (value) => {
    if (vote) return;
    setVote(value);
    track(EVENTS.helpfulVote, {helpful: value === 'yes'});
  };

  if (vote) {
    return (
      <div className={styles.helpful} role="status">
        Thanks for the feedback.
      </div>
    );
  }

  return (
    <div className={styles.helpful}>
      <span id="helpful-label">Was this page helpful?</span>
      <div role="group" aria-labelledby="helpful-label" className={styles.buttons}>
        <button type="button" className="button button--sm button--outline button--secondary" onClick={() => send('yes')}>
          <span aria-hidden="true">👍</span> Yes
        </button>
        <button type="button" className="button button--sm button--outline button--secondary" onClick={() => send('no')}>
          <span aria-hidden="true">👎</span> No
        </button>
      </div>
    </div>
  );
}
