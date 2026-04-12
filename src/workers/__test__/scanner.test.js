const { startScanner, runScan } = require("../../workers/scanner");
const {
  repositoryRepository,
  subscriptionRepository,
} = require("../../repositories");
const { githubService, emailService } = require("../../services");
const logger = require("../../utils/logger");

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

jest.mock("../../repositories", () => ({
  repositoryRepository: {
    findAllWithActiveSubscriptions: jest.fn(),
    updateLastSeenTag: jest.fn(),
  },
  subscriptionRepository: {
    findActiveEmailsByRepoId: jest.fn(),
  },
}));

jest.mock("../../services", () => ({
  githubService: {
    findRepositoriesBatch: jest.fn(),
  },
  emailService: {
    sendNewReleaseEmail: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../config", () => ({
  app: {
    scannerCron: "*/10 * * * *",
  },
}));

describe("Scanner Worker", () => {
  beforeAll(() => {
    startScanner();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Given no active repositories, When scan runs, Then does not call GitHub service", async () => {
    repositoryRepository.findAllWithActiveSubscriptions.mockResolvedValue([]);

    await runScan();

    expect(githubService.findRepositoriesBatch).not.toHaveBeenCalled();
  });

  it("Given repository with new tag, When scan runs, Then updates last seen tag and sends email", async () => {
    repositoryRepository.findAllWithActiveSubscriptions.mockResolvedValue([
      { id: "repo-1", owner_repo: "owner/repo", last_seen_tag: "v1.0.0" },
    ]);
    githubService.findRepositoriesBatch.mockResolvedValue([
      { id: "repo-1", latest_tag: "v2.0.0" },
    ]);
    subscriptionRepository.findActiveEmailsByRepoId.mockResolvedValue([
      "user@example.com",
    ]);

    await runScan();

    expect(repositoryRepository.updateLastSeenTag).toHaveBeenCalledWith(
      "repo-1",
      "v2.0.0",
    );
    expect(emailService.sendNewReleaseEmail).toHaveBeenCalledWith(
      ["user@example.com"],
      "owner/repo",
      "v2.0.0",
    );
  });

  it("Given repository with unchanged tag, When scan runs, Then does not update tag and does not send email", async () => {
    repositoryRepository.findAllWithActiveSubscriptions.mockResolvedValue([
      { id: "repo-1", owner_repo: "owner/repo", last_seen_tag: "v1.0.0" },
    ]);
    githubService.findRepositoriesBatch.mockResolvedValue([
      { id: "repo-1", latest_tag: "v1.0.0" },
    ]);

    await runScan();

    expect(repositoryRepository.updateLastSeenTag).not.toHaveBeenCalled();
    expect(emailService.sendNewReleaseEmail).not.toHaveBeenCalled();
  });

  it("Given repository with no latest tag, When scan runs, Then does not update tag and does not send email", async () => {
    repositoryRepository.findAllWithActiveSubscriptions.mockResolvedValue([
      { id: "repo-1", owner_repo: "owner/repo", last_seen_tag: "v1.0.0" },
    ]);
    githubService.findRepositoriesBatch.mockResolvedValue([
      { id: "repo-1", latest_tag: null },
    ]);

    await runScan();

    expect(repositoryRepository.updateLastSeenTag).not.toHaveBeenCalled();
    expect(emailService.sendNewReleaseEmail).not.toHaveBeenCalled();
  });

  it("Given scan is already running, When scan runs again, Then logs warning and skips execution", async () => {
    repositoryRepository.findAllWithActiveSubscriptions.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 50)),
    );

    const firstExecution = runScan();
    const secondExecution = runScan();

    await Promise.all([firstExecution, secondExecution]);

    expect(logger.warn).toHaveBeenCalledWith(
      "Previous scan still running, skipping",
    );
    expect(
      repositoryRepository.findAllWithActiveSubscriptions,
    ).toHaveBeenCalledTimes(1);
  });

  it("Given multiple batches where one fails, When scan runs, Then logs error and continues to next batch", async () => {
    const mockRepositories = Array.from({ length: 100 }, (_, index) => ({
      id: `repo-${index}`,
      owner_repo: `owner/repo${index}`,
      last_seen_tag: "v1.0.0",
    }));

    repositoryRepository.findAllWithActiveSubscriptions.mockResolvedValue(
      mockRepositories,
    );

    githubService.findRepositoriesBatch
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce([{ id: "repo-50", latest_tag: "v2.0.0" }]);

    subscriptionRepository.findActiveEmailsByRepoId.mockResolvedValue([
      "user@example.com",
    ]);

    await runScan();

    expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
    expect(githubService.findRepositoriesBatch).toHaveBeenCalledTimes(2);
    expect(repositoryRepository.updateLastSeenTag).toHaveBeenCalledWith(
      "repo-50",
      "v2.0.0",
    );
    expect(emailService.sendNewReleaseEmail).toHaveBeenCalledWith(
      ["user@example.com"],
      "owner/repo50",
      "v2.0.0",
    );
  });
});
