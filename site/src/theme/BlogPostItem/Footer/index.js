// Wraps the default blog post footer to add the "Was this helpful?" widget
// on full post pages only (not on the blog list).
import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import Helpful from '@site/src/components/Helpful';

export default function FooterWrapper(props) {
  const {isBlogPostPage} = useBlogPost();
  return (
    <>
      {isBlogPostPage && <Helpful contentType="blog" />}
      <Footer {...props} />
    </>
  );
}
