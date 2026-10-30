import React, {useState} from 'react';
import {useLocation} from '@docusaurus/router';
import {EVENTS, track} from '@site/src/lib/analytics';
import styles from './styles.module.css';

// "Was this helpful?" widget. Votes go to CloudWatch RUM as custom events,
// so there is no backend to run and no GitHub sign-in required.
export default function Helpful({contentType}) {
  const {pathname} = useLocation();
  const [vote, setVote] = useState(null);

  const send = (value) => {
    if (vote) return;
    setVote(value);
    track(EVENTS.helpfulVote, {page: pathname, contentType, helpful: value === 'yes'});
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
