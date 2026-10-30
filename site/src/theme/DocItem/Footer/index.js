// Wraps the default doc footer to add the "Was this helpful?" widget.
import React from 'react';
import Footer from '@theme-original/DocItem/Footer';
import Helpful from '@site/src/components/Helpful';

export default function FooterWrapper(props) {
  return (
    <>
      <Helpful contentType="doc" />
      <Footer {...props} />
    </>
  );
}
