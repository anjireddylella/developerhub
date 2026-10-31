// Build-time plugin that turns validated GitHub Discussions into bounded hub pages.

import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import hub from '../../hub.config.js';
import {
  COMMUNITY_LIMITS,
  CommunityValidationError,
  isPreparedCommunityContent,
  logQuarantine,
  prepareCommunityContent,
  validateCommunitySearch,
} from './communityValidation.js';
import {utf8Bytes} from '../api-content/catalogValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAX_PER_CATEGORY = COMMUNITY_LIMITS.fetchedPerSection;

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
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'sp-api-developer-hub-build',
    },
    body: JSON.stringify({query, variables}),
  });
  if (!response.ok) throw new Error(`GitHub GraphQL HTTP ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error('GitHub GraphQL returned errors');
  return json.data;
}

async function fetchLive(token) {
  const {owner, name, categories} = hub.github;
  const data = await graphql(token, CATEGORIES_QUERY, {owner, name});
  const all = data.repository?.discussionCategories?.nodes ?? [];

  const load = async (slug) => {
    const category = all.find((candidate) => candidate.slug === slug);
    if (!category) throw new Error('Required discussion category was not found');
    const result = await graphql(token, DISCUSSIONS_QUERY, {
      owner,
      name,
      categoryId: category.id,
      first: MAX_PER_CATEGORY,
    });
    return result.repository?.discussions?.nodes ?? [];
  };

  const [questions, ideas] = await Promise.all([load(categories.questions), load(categories.ideas)]);
  return {source: 'github', questions, ideas};
}

async function loadSample() {
  const raw = JSON.parse(await readFile(path.join(here, 'sample-data.json'), 'utf8'));
  return {source: 'sample', questions: raw.questions, ideas: raw.ideas};
}

function sectionDefinitions(content) {
  const {owner, name, categories} = hub.github;
  const repositoryUrl = `https://github.com/${owner}/${name}`;
  return [
    {
      key: 'questions',
      title: 'Questions',
      description:
        'Ask the SP-API developer community and help others. Answers and votes happen right here.',
      items: content.questions.items,
      unavailableCount: content.questions.unavailableCount,
      category: categories.questions,
      newUrl: `${repositoryUrl}/discussions/new?category=${categories.questions}`,
      openUrl: `${repositoryUrl}/discussions/categories/${categories.questions}`,
      newLabel: 'Ask a question',
    },
    {
      key: 'ideas',
      title: 'Ideas',
      description:
        'Suggest improvements to SP-API and vote for the ideas you want most. Use 👍 on an idea to vote.',
      items: content.ideas.items,
      unavailableCount: content.ideas.unavailableCount,
      category: categories.ideas,
      newUrl: `${repositoryUrl}/discussions/new?category=${categories.ideas}`,
      openUrl: `${repositoryUrl}/discussions/categories/${categories.ideas}`,
      newLabel: 'Submit an idea',
    },
  ];
}

function boundedAuthored(value, limit, rule) {
  if (typeof value !== 'string' || value.length === 0 || utf8Bytes(value) > limit) {
    throw new CommunityValidationError(rule);
  }
}

function sectionProjection(section) {
  const basePath = `/community/${section.key}`;
  boundedAuthored(section.key, 10, 'section-key');
  if (!['questions', 'ideas'].includes(section.key)) throw new CommunityValidationError('section-key');
  boundedAuthored(section.title, 40, 'section-title');
  boundedAuthored(section.description, 320, 'section-description');
  boundedAuthored(section.newLabel, 80, 'section-new-label');
  boundedAuthored(basePath, 80, 'section-base-path');
  boundedAuthored(section.newUrl, 240, 'section-new-url');
  boundedAuthored(section.openUrl, 240, 'section-open-url');
  const canonicalBase = 'https://github.com/anjireddylella/developerhub/discussions/';
  if (!section.newUrl.startsWith(`${canonicalBase}new?category=`)) {
    throw new CommunityValidationError('section-new-url');
  }
  if (!section.openUrl.startsWith(`${canonicalBase}categories/`)) {
    throw new CommunityValidationError('section-open-url');
  }
  return {
    key: section.key,
    title: section.title,
    description: section.description,
    newUrl: section.newUrl,
    openUrl: section.openUrl,
    newLabel: section.newLabel,
    basePath,
    unavailableCount: section.unavailableCount,
  };
}

const listItem = ({number, title, updatedAt, isAnswered, locked, author, replies, labels, votes}) => ({
  number,
  title,
  updatedAt,
  isAnswered,
  locked,
  author,
  replies,
  labels,
  votes,
});

const homeItem = ({number, title, votes, replies, isAnswered}) => ({
  number,
  title,
  votes,
  replies,
  isAnswered,
});

function searchItem(section, item) {
  return {
    number: item.number,
    title: item.title,
    labels: item.labels.map((label) => label.name),
    section: section.key,
    route: `/community/${section.key}/${item.number}`,
  };
}

function jsonBytes(value) {
  return utf8Bytes(JSON.stringify(value));
}

function recordAggregateDrop(content, section, item, logger) {
  logQuarantine(logger, section.key, item.number, 'aggregate-size');
  section.unavailableCount = Math.min(
    section.unavailableCount + 1,
    COMMUNITY_LIMITS.fetchedPerSection,
  );
  content[section.key].unavailableCount = section.unavailableCount;
}

function removeLowestPriority(content, sections, logger) {
  const candidates = sections.filter((section) => section.items.length > 0);
  if (!candidates.length) return false;
  const section = candidates.sort((a, b) => b.items.length - a.items.length)[0];
  const item = section.items.pop();
  content[section.key].items = section.items;
  recordAggregateDrop(content, section, item, logger);
  return true;
}

function handleAggregateOverflow(content, sections, source, logger, rule) {
  if (source === 'sample') throw new CommunityValidationError(rule);
  if (!removeLowestPriority(content, sections, logger)) throw new CommunityValidationError(rule);
}

export function buildCommunityPayloads(
  preparedContent,
  {logger = console.warn, limits = COMMUNITY_LIMITS} = {},
) {
  const content = {
    source: preparedContent.source,
    questions: {
      items: [...preparedContent.questions.items],
      unavailableCount: preparedContent.questions.unavailableCount,
    },
    ideas: {
      items: [...preparedContent.ideas.items],
      unavailableCount: preparedContent.ideas.unavailableCount,
    },
  };
  const sections = sectionDefinitions(content);

  for (const section of sections) {
    for (let index = section.items.length - 1; index >= 0; index -= 1) {
      const item = section.items[index];
      const thread = {
        section: {key: section.key, title: section.title, basePath: `/community/${section.key}`},
        source: content.source,
        item,
      };
      if (jsonBytes(thread) <= limits.threadModule) continue;
      if (content.source === 'sample') throw new CommunityValidationError(`${section.key}:thread-size`);
      section.items.splice(index, 1);
      content[section.key].items = section.items;
      recordAggregateDrop(content, section, item, logger);
    }
  }

  for (const section of sections) {
    while (true) {
      const list = {
        section: sectionProjection(section),
        source: content.source,
        items: section.items.map(listItem),
      };
      if (jsonBytes(list) <= limits.listModule) break;
      handleAggregateOverflow(content, [section], content.source, logger, `${section.key}:list-size`);
    }
  }

  const makeHome = () => ({
    source: content.source,
    latestQuestions: sections[0].items.slice(0, 3).map(homeItem),
    topIdeas: sections[1].items.slice(0, 3).map(homeItem),
  });
  while (jsonBytes(makeHome()) > limits.homeModule) {
    handleAggregateOverflow(content, sections, content.source, logger, 'home:aggregate-size');
  }

  const makeSearch = () => sections.flatMap((section) => section.items.map((item) => searchItem(section, item)));
  while (jsonBytes(makeSearch()) > limits.searchModule) {
    handleAggregateOverflow(content, sections, content.source, logger, 'community-search:aggregate-size');
  }

  const lists = sections.map((section) => ({
    key: section.key,
    data: {
      section: sectionProjection(section),
      source: content.source,
      items: section.items.map(listItem),
    },
  }));
  const threads = sections.flatMap((section) => section.items.map((item) => ({
    key: section.key,
    number: item.number,
    data: {
      section: {key: section.key, title: section.title, basePath: `/community/${section.key}`},
      source: content.source,
      item,
    },
  })));
  const communitySearch = validateCommunitySearch(makeSearch());
  const home = makeHome();
  if (jsonBytes(home) > limits.homeModule || jsonBytes(communitySearch) > limits.searchModule) {
    throw new CommunityValidationError('global-data-size');
  }
  return {lists, threads, globalData: {...home, communitySearch}};
}

export async function serializeCommunityContent(content, actions, options = {}) {
  const prepared = isPreparedCommunityContent(content)
    ? content
    : prepareCommunityContent(content, options);
  const payloads = buildCommunityPayloads(prepared, options);
  const {createData, addRoute, setGlobalData} = actions;

  for (const list of payloads.lists) {
    const listData = await createData(`${list.key}-list.json`, JSON.stringify(list.data));
    addRoute({
      path: `/community/${list.key}`,
      component: '@site/src/components/community/DiscussionListPage',
      modules: {data: listData},
      exact: true,
    });
  }
  for (const thread of payloads.threads) {
    const threadData = await createData(
      `${thread.key}-${thread.number}.json`,
      JSON.stringify(thread.data),
    );
    addRoute({
      path: `/community/${thread.key}/${thread.number}`,
      component: '@site/src/components/community/DiscussionPage',
      modules: {data: threadData},
      exact: true,
    });
  }
  setGlobalData(payloads.globalData);
  return payloads;
}

export default function communityPlugin() {
  return {
    name: 'hub-community',

    async loadContent() {
      const token = process.env.HUB_GITHUB_TOKEN;
      if (!token) {
        console.warn('[hub-community] HUB_GITHUB_TOKEN not set, using sample discussions.');
        return prepareCommunityContent(await loadSample());
      }
      try {
        return prepareCommunityContent(await fetchLive(token));
      } catch (error) {
        if (process.env.CI) throw error;
        console.warn('[hub-community] Live discussions unavailable; using sample discussions.');
        return prepareCommunityContent(await loadSample());
      }
    },

    async contentLoaded({content, actions}) {
      await serializeCommunityContent(content, actions);
    },
  };
}
