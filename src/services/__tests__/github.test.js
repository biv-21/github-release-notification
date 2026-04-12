const mockGraphql = jest.fn();

jest.mock("@octokit/core", () => {
  const MockOctokit = class {
    constructor() {
      this.graphql = mockGraphql;
    }
  };
  MockOctokit.plugin = jest.fn().mockReturnValue(MockOctokit);
  return { Octokit: MockOctokit };
});

jest.mock("@octokit/plugin-throttling", () => ({
  throttling: jest.fn(),
}));

jest.mock("../../config", () => ({
  app: { githubToken: "test_token" },
}));

const {
  findRepository,
  findRepositoriesBatch,
} = require("../../services/github");

describe("GitHub Service", () => {
  beforeEach(() => {
    mockGraphql.mockReset();
  });

  describe("findRepository", () => {
    it("Given repository with tags, When findRepository is called, Then returns repo data with latest tag", async () => {
      mockGraphql.mockResolvedValue({
        repository: {
          refs: {
            nodes: [
              {
                name: "v1.0.0",
                target: { committedDate: "2026-01-01T00:00:00Z" },
              },
            ],
          },
        },
      });

      const result = await findRepository("owner/repo");

      expect(result).toEqual({
        owner_repo: "owner/repo",
        latest_tag: "v1.0.0",
        latest_tag_date: "2026-01-01T00:00:00Z",
      });
      expect(mockGraphql).toHaveBeenCalledTimes(1);
    });

    it("Given repository not found, When findRepository is called, Then returns null", async () => {
      const error = new Error("Not Found");
      error.status = 404;
      mockGraphql.mockRejectedValue(error);

      const result = await findRepository("owner/invalid");

      expect(result).toBeNull();
    });

    it("Given server error, When findRepository is called, Then re-throws error", async () => {
      const error = new Error("Internal Server Error");
      error.status = 500;
      mockGraphql.mockRejectedValue(error);

      await expect(findRepository("owner/repo")).rejects.toThrow(
        "Internal Server Error",
      );
    });

    it("Given repository with no tags, When findRepository is called, Then returns null latest_tag", async () => {
      mockGraphql.mockResolvedValue({
        repository: {
          refs: {
            nodes: [],
          },
        },
      });

      const result = await findRepository("owner/repo");

      expect(result).toEqual({
        owner_repo: "owner/repo",
        latest_tag: null,
        latest_tag_date: null,
      });
    });
  });

  describe("findRepositoriesBatch", () => {
    it("Given empty input, When findRepositoriesBatch is called, Then returns empty array without API call", async () => {
      const result = await findRepositoriesBatch([]);

      expect(result).toEqual([]);
      expect(mockGraphql).not.toHaveBeenCalled();
    });

    it("Given valid repositories, When findRepositoriesBatch is called, Then maps results correctly including id passthrough", async () => {
      const input = [
        { id: "uuid-1", owner: "owner1", name: "repo1" },
        { id: "uuid-2", owner: "owner2", name: "repo2" },
      ];

      mockGraphql.mockResolvedValue({
        repository_0: {
          refs: {
            nodes: [
              {
                name: "v2.0.0",
                target: { target: { committedDate: "2026-02-01T00:00:00Z" } },
              },
            ],
          },
        },
        repository_1: {
          refs: {
            nodes: [],
          },
        },
      });

      const result = await findRepositoriesBatch(input);

      expect(result).toEqual([
        {
          id: "uuid-1",
          owner_repo: "owner1/repo1",
          latest_tag: "v2.0.0",
          latest_tag_date: "2026-02-01T00:00:00Z",
        },
        {
          id: "uuid-2",
          owner_repo: "owner2/repo2",
          latest_tag: null,
          latest_tag_date: null,
        },
      ]);
    });

    it("Given rate limit error, When findRepositoriesBatch is called, Then throws error", async () => {
      const error = new Error("Rate limit exceeded");
      error.status = 403;
      mockGraphql.mockRejectedValue(error);

      const input = [{ id: "uuid-1", owner: "owner1", name: "repo1" }];

      await expect(findRepositoriesBatch(input)).rejects.toThrow(
        "Rate limit exceeded",
      );
    });
  });
});
