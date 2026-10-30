import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './index.module.css';

const CARDS = [
  {
    title: 'Start here',
    to: '/docs/intro',
    body: 'Register an app, get a Login with Amazon token, and make your first call.',
  },
  {
    title: 'Hot topics',
    to: '/blog',
    body: 'Launches, deprecations, and migration notes from the SP-API team.',
  },
  {
    title: 'Ask the community',
    to: '/community/questions',
    body: 'Search answered questions or ask your own. Answer others to help them out.',
  },
  {
    title: 'Ideas',
    to: '/community/ideas',
    body: 'Suggest improvements and vote on the ideas you want most.',
  },
  {
    title: 'Resources',
    to: '/resources',
    body: 'API models, code samples, SDKs, and the MCP server in one list.',
  },
];

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.hero)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.actions}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Start here
          </Link>
          <Link className="button button--outline button--lg" to="/community/questions">
            Ask a question
          </Link>
        </div>
      </div>
    </header>
  );
}

function CommunityList({title, items, basePath, stat}) {
  return (
    <div className="col col--6">
      <Heading as="h2">{title}</Heading>
      <ul>
        {items.map((i) => (
          <li key={i.number}>
            <Link to={`${basePath}/${i.number}`}>{i.title}</Link>{' '}
            <small>({stat(i)})</small>
          </li>
        ))}
      </ul>
      <Link to={basePath}>See all →</Link>
    </div>
  );
}

export default function Home() {
  const community = usePluginData('hub-community');
  return (
    <Layout description="The front door for Amazon Selling Partner API developers">
      <Hero />
      <main className="container margin-vert--lg">
        <section aria-label="Get started" className={styles.cards}>
          {CARDS.map((c) => (
            <Link key={c.title} to={c.to} className={clsx('card', styles.card)}>
              <div className="card__header">
                <Heading as="h3">{c.title}</Heading>
              </div>
              <div className="card__body">
                <p>{c.body}</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="row margin-top--xl" aria-label="Community activity">
          <CommunityList
            title="Latest questions"
            items={community.latestQuestions}
            basePath="/community/questions"
            stat={(i) => (i.isAnswered ? 'answered' : `${i.replies} replies`)}
          />
          <CommunityList
            title="Top ideas"
            items={community.topIdeas}
            basePath="/community/ideas"
            stat={(i) => `${i.votes} votes`}
          />
        </section>
      </main>
    </Layout>
  );
}
