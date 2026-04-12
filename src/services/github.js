const { Octokit } = require("@octokit/core");
const { throttling } = require("@octokit/plugin-throttling");
const { app } = require("../config");

const OctokitWithPlugin = Octokit.plugin(throttling);
const octokit = new OctokitWithPlugin({
  auth: app.githubToken,
  throttle: {
    onRateLimit: (_retryAfter, _options, _octokit, retryCount) => {
      if (retryCount < 1) {
        return true;
      }
    },
    onSecondaryRateLimit: (_retryAfter, _options, _octokit) => {
      return true;
    },
  },
});

const REPO_AND_TAG_QUERY = `
  query getRepoAndTag($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
      name
      refs(refPrefix: "refs/tags/", first: 1, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
        nodes {
          name
          target {
            ... on Commit { committedDate }
            ... on Tag { target { ... on Commit { committedDate } } }
          }
        }
      }
    }
  }
`;

const buildBatchQuery = (repositories) => {
  let query = "query {\n";
  repositories.forEach(({ owner, name }, index) => {
    query += `
      repository_${index}: repository(owner: "${owner}", name: "${name}") {
        id
        name
        refs(refPrefix: "refs/tags/", first: 1, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
          nodes {
            name
            target {
              ... on Commit { committedDate }
              ... on Tag { target { ... on Commit { committedDate } } }
            }
          }
        }
      }
    `;
  });
  query += "\n}";
  return query;
};

const findRepository = async (ownerRepo) => {
  try {
    const [owner, repo] = ownerRepo.split("/");
    const response = await octokit.graphql(REPO_AND_TAG_QUERY, { owner, repo });

    let latestTag = null;
    let latestTagDate = null;

    if (response.repository.refs.nodes.length > 0) {
      const node = response.repository.refs.nodes[0];
      latestTag = node.name;
      latestTagDate =
        node.target.committedDate || node.target.target?.committedDate || null;
    }

    return {
      owner_repo: `${owner}/${repo}`,
      latest_tag: latestTag,
      latest_tag_date: latestTagDate,
    };
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
};

const findRepositoryLastTag = async (ownerRepo) => {
  const repoData = await findRepository(ownerRepo);
  return repoData ? repoData.latest_tag : null;
};

const findRepositoriesBatch = async (repositories) => {
  if (!repositories || repositories.length === 0) return [];

  const query = buildBatchQuery(repositories);
  let data = {};
  const results = [];

  try {
    data = await octokit.graphql(query);
  } catch (error) {
    if (error.name === "GraphqlResponseError" && error.data) {
      data = error.data;
    } else {
      throw error;
    }
  }

  repositories.forEach((repository, index) => {
    const repositoryData = data[`repository_${index}`];
    if (repositoryData) {
      let latestTag = null;
      let latestTagDate = null;

      if (repositoryData.refs.nodes.length > 0) {
        const node = repositoryData.refs.nodes[0];
        latestTag = node.name;
        latestTagDate =
          node.target.committedDate ||
          node.target.target?.committedDate ||
          null;
      }

      results.push({
        id: repository.id,
        owner_repo: `${repository.owner}/${repository.name}`,
        latest_tag: latestTag,
        latest_tag_date: latestTagDate,
      });
    }
  });

  return results;
};

module.exports = {
  findRepository,
  findRepositoryLastTag,
  findRepositoriesBatch,
};
