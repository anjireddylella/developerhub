/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Copied from @docusaurus/theme-classic@3.10.2 and narrowed to add
// success-only, identifier-only copy analytics plus accessible failure state.
import React, {useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import {useCodeBlockContext} from '@docusaurus/theme-common/internal';
import Button from '@theme/CodeBlock/Buttons/Button';
import IconCopy from '@theme/Icon/Copy';
import IconSuccess from '@theme/Icon/Success';
import {EVENTS, track} from '../../../../lib/analytics.js';
import {useCodeAnalytics} from '../../../../components/AnalyticsCodeBlock/context.js';
import {copyCodeAndReport} from '../../../../components/AnalyticsCodeBlock/copyBehavior.js';
import styles from './styles.module.css';

function title() {
  return translate({
    id: 'theme.CodeBlock.copy',
    message: 'Copy',
    description: 'The copy button label on code blocks',
  });
}

function ariaLabel(status) {
  if (status === 'copied') {
    return translate({
      id: 'theme.CodeBlock.copied',
      message: 'Copied',
      description: 'The copied button label on code blocks',
    });
  }
  if (status === 'failed') {
    return translate({
      id: 'theme.CodeBlock.copyFailed',
      message: 'Copy failed',
      description: 'The failed copy button label on code blocks',
    });
  }
  return translate({
    id: 'theme.CodeBlock.copyButtonAriaLabel',
    message: 'Copy code to clipboard',
    description: 'The ARIA label for copy code blocks button',
  });
}

async function copyToClipboard(text) {
  // The clipboard API is only defined in secure contexts (HTTPS / localhost).
  // See https://developer.mozilla.org/en-US/docs/Web/API/Clipboard
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  // Keep Docusaurus's lazy fallback for non-secure local contexts.
  const {default: copy} = await import('copy-text-to-clipboard');
  return copy(text);
}

function useCopyButton() {
  const {metadata: {code}} = useCodeBlockContext();
  const analyticsContext = useCodeAnalytics();
  const [status, setStatus] = useState('idle');
  const copyTimeout = useRef(undefined);

  const copyCode = useCallback(() => {
    void copyCodeAndReport({
      code,
      copy: copyToClipboard,
      analyticsContext,
      report: ({codeId, language}) => track(EVENTS.contentCopy, {codeId, language}),
    }).then(() => {
      setStatus('copied');
      copyTimeout.current = window.setTimeout(() => setStatus('idle'), 1000);
    }).catch(() => {
      setStatus('failed');
      copyTimeout.current = window.setTimeout(() => setStatus('idle'), 1000);
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('[analytics] Code copy failed.');
      }
    });
  }, [analyticsContext, code]);

  useEffect(() => () => window.clearTimeout(copyTimeout.current), []);
  return {copyCode, status};
}

export default function CopyButton({className}) {
  const {copyCode, status} = useCopyButton();
  const isCopied = status === 'copied';

  return (
    <Button
      aria-label={ariaLabel(status)}
      title={title()}
      className={clsx(
        className,
        styles.copyButton,
        isCopied && styles.copyButtonCopied,
        status === 'failed' && styles.copyButtonFailed,
      )}
      onClick={copyCode}>
      <span className={styles.copyButtonIcons} aria-hidden="true">
        <IconCopy className={styles.copyButtonIcon} />
        <IconSuccess className={styles.copyButtonSuccessIcon} />
      </span>
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'failed' ? 'Copy failed' : status === 'copied' ? 'Copied' : ''}
      </span>
    </Button>
  );
}
