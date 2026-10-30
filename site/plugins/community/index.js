// Build-time plugin that turns GitHub Discussions into pages on the hub.
//
// With HUB_GITHUB_TOKEN set, it reads the Q&A and Ideas categories through the
// GitHub GraphQL API. Without a token it falls back to sample-data.json so the
// site builds locally with no credentials. In CI (CI=true) a failed fetch fails
// the build instead of silently publishing sample data.

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import hub from '../../hub.config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_PER_CATEGORY = 100;

const DISCUSSIONS_QUERY = `
query($owner: String!, $name: String!, $categoryId: ID!, $first: Int!) {
  repository(owner: $owner, name: $name) {
    discussions(first: $first, categoryId: $categoryId, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number
        title
        url
        bodyHTML
        createdAt
        updatedAt
        upvoteCount
        isAnswered
        locked
        author { login avatarUrl }
        comments { totalCount }
        labels(first: 10) { nodes { name color } }
        reactionGroups { content reactors { totalCount } }
      }
    }
  }
}`;

const CATEGORIES_QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussionCategories(first: 25) { nodes { id name slug } }
  }
}`;

async function graphql(token, query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'sp-api-developer-hub-build',
    },
    body: JSON.stringify({query, variables}),
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GitHub GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  return json.data;
}

// Votes on the hub are 👍 reactions (what Giscus exposes) plus native
// GitHub upvotes, so both ways of voting count.
function normalize(d) {
  const thumbsUp =
    d.reactionGroups?.find((g) => g.content === 'THUMBS_UP')?.reactors?.totalCount ?? 0;
  return {
    number: d.number,
    title: d.title,
    url: d.url,
    bodyHTML: d.bodyHTML,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    isAnswered: Boolean(d.isAnswered),
    locked: Boolean(d.locked),
    author: d.author ? {login: d.author.login, avatarUrl: d.author.avatarUrl} : null,
    replies: d.comments?.totalCount ?? 0,
    labels: (d.labels?.nodes ?? []).map((l) => ({name: l.name, color: l.color})),
    votes: (d.upvoteCount ?? 0) + thumbsUp,
  };
}

async function fetchLive(token) {
  const {owner, name, categories} = hub.github;
  const data = await graphql(token, CATEGORIES_QUERY, {owner, name});
  const all = data.repository?.discussionCategories?.nodes ?? [];

  const load = async (slug) => {
    const category = all.find((c) => c.slug === slug);
    if (!category) {
      throw new Error(`Discussion category "${slug}" not found in ${owner}/${name}`);
    }
    const result = await graphql(token, DISCUSSIONS_QUERY, {
      owner,
      name,
      categoryId: category.id,
      first: MAX_PER_CATEGORY,
    });
    return result.repository.discussions.nodes.map(normalize);
  };

  const [questions, ideas] = await Promise.all([load(categories.questions), load(categories.ideas)]);
  return {source: 'github', questions, ideas};
}

async function loadSample() {
  const raw = JSON.parse(await readFile(path.join(here, 'sample-data.json'), 'utf8'));
  return {
    source: 'sample',
    questions: raw.questions.map(normalize),
    ideas: raw.ideas.map(normalize),
  };
}

export default function communityPlugin() {
  return {
    name: 'hub-community',

    async loadContent() {
      const token = process.env.HUB_GITHUB_TOKEN;
      if (!token) {
        console.warn('[hub-community] HUB_GITHUB_TOKEN not set, using sample discussions.');
        return loadSample();
      }
      try {
        return await fetchLive(token);
      } catch (err) {
        if (process.env.CI) {
          throw err;
        }
        console.warn(`[hub-community] ${err.message}. Falling back to sample discussions.`);
        return loadSample();
      }
    },

    async contentLoaded({content, actions}) {
      const {createData, addRoute, setGlobalData} = actions;
      const {owner, name, categories} = hub.github;
      const repoUrl = `https://github.com/${owner}/${name}`;

      const sections = [
        {
          key: 'questions',
          title: 'Questions',
          description:
            'Ask the SP-API developer community and help others. Answers and votes happen right here.',
          items: content.questions,
          // Most recently active first.
          sort: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
          newUrl: `${repoUrl}/discussions/new?category=${categories.questions}`,
          newLabel: 'Ask a question',
        },
        {
          key: 'ideas',
          title: 'Ideas',
          description:
            'Suggest improvements to SP-API and vote for the ideas you want most. Use 👍 on an idea to vote.',
          items: content.ideas,
          // Most votes first.
          sort: (a, b) => b.votes - a.votes || b.updatedAt.localeCompare(a.updatedAt),
          newUrl: `${repoUrl}/discussions/new?category=${categories.ideas}`,
          newLabel: 'Submit an idea',
        },
      ];

      for (const s of sections) {
        const sorted = [...s.items].sort(s.sort);
        const basePath = `/community/${s.key}`;

        // List page gets summaries only, so the list bundle stays small.
        const summaries = sorted.map(({bodyHTML, ...rest}) => rest);
        const listData = await createData(
          `${s.key}-list.json`,
          JSON.stringify({
            section: {
              key: s.key,
              title: s.title,
              description: s.description,
              newUrl: s.newUrl,
              newLabel: s.newLabel,
              basePath,
            },
            source: content.source,
            items: summaries,
          }),
        );
        addRoute({
          path: basePath,
          component: '@site/src/components/community/DiscussionListPage',
          modules: {data: listData},
          exact: true,
        });

        for (const item of sorted) {
          const threadData = await createData(
            `${s.key}-${item.number}.json`,
            JSON.stringify({
              section: {key: s.key, title: s.title, basePath},
              source: content.source,
              item,
            }),
          );
          addRoute({
            path: `${basePath}/${item.number}`,
            component: '@site/src/components/community/DiscussionPage',
            modules: {data: threadData},
            exact: true,
          });
        }
      }

      // Small slice for the home page.
      const pick = ({number, title, votes, replies, isAnswered}) => ({
        number,
        title,
        votes,
        replies,
        isAnswered,
      });
      setGlobalData({
        source: content.source,
        latestQuestions: [...content.questions]
          .sort(sections[0].sort)
          .slice(0, 3)
          .map(pick),
        topIdeas: [...content.ideas].sort(sections[1].sort).slice(0, 3).map(pick),
      });
    },
  };
}
