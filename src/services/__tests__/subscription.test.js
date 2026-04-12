const {
  subscribe,
  confirmSubscription,
  unsubscribe,
  getSubscriptions,
} = require("../../services/subscription");

const {
  subscriptionRepository,
  userRepository,
  repositoryRepository,
} = require("../../repositories");
const githubService = require("../../services/github");
const emailService = require("../../services/email");
const { ConflictError, NotFoundError } = require("../../utils/errors");

jest.mock("node:crypto", () => ({
  createHash: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue("mocked_hashed_token"),
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue("mocked_raw_token"),
  }),
}));

jest.mock("../../models", () => ({
  User: { schema: { shape: { email: { parse: jest.fn((val) => val) } } } },
  Repository: {
    schema: { shape: { owner_repo: { parse: jest.fn((val) => val) } } },
  },
  Subscription: {
    schema: { shape: { token: { parse: jest.fn((val) => val) } } },
  },
}));

jest.mock("../../repositories", () => ({
  subscriptionRepository: {
    findByEmailAndRepo: jest.fn(),
    updateStatusAndToken: jest.fn(),
    create: jest.fn(),
    findByToken: jest.fn(),
    updateStatus: jest.fn(),
    findByEmail: jest.fn(),
  },
  userRepository: {
    findByEmail: jest.fn(),
    create: jest.fn(),
  },
  repositoryRepository: {
    findByOwnerRepo: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../services/github", () => ({
  findRepository: jest.fn(),
}));

jest.mock("../../services/email", () => ({
  sendConfirmationEmail: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe("Subscription Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const email = "test@example.com";
  const repo = "owner/repo";

  describe("subscribe", () => {
    it("Given new user and new repo, When subscribe is called, Then creates subscription and sends email", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      repositoryRepository.findByOwnerRepo.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({ id: "user-1" });
      githubService.findRepository.mockResolvedValue({
        owner_repo: repo,
        latest_tag: "v1.0.0",
      });
      repositoryRepository.create.mockResolvedValue({ id: "repo-1" });
      subscriptionRepository.create.mockResolvedValue({
        id: "sub-1",
        status: "created",
      });

      const result = await subscribe(email, repo);

      expect(userRepository.create).toHaveBeenCalledWith(email);
      expect(githubService.findRepository).toHaveBeenCalledWith(repo);
      expect(repositoryRepository.create).toHaveBeenCalledWith(repo, "v1.0.0");
      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        "user-1",
        "repo-1",
        "mocked_hashed_token",
      );
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith(
        email,
        repo,
        "mocked_raw_token",
      );
      expect(result).toEqual({ id: "sub-1", status: "created" });
    });

    it("Given existing active subscription, When subscribe is called, Then throws ConflictError", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue({
        status: "active",
      });

      await expect(subscribe(email, repo)).rejects.toThrow(ConflictError);
    });

    it("Given existing created subscription, When subscribe is called, Then throws ConflictError", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue({
        status: "created",
      });

      await expect(subscribe(email, repo)).rejects.toThrow(ConflictError);
    });

    it("Given existing deactivated subscription, When subscribe is called, Then updates token and resends email", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue({
        id: "sub-old",
        status: "deactivated",
      });
      subscriptionRepository.updateStatusAndToken.mockResolvedValue({
        id: "sub-old",
        status: "created",
      });

      const result = await subscribe(email, repo);

      expect(subscriptionRepository.updateStatusAndToken).toHaveBeenCalledWith(
        "sub-old",
        "created",
        "mocked_hashed_token",
      );
      expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith(
        email,
        repo,
        "mocked_raw_token",
      );
      expect(result).toEqual({ id: "sub-old", status: "created" });
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(repositoryRepository.create).not.toHaveBeenCalled();
    });

    it("Given repo not found on GitHub, When subscribe is called, Then throws NotFoundError", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({ id: "user-1" });
      repositoryRepository.findByOwnerRepo.mockResolvedValue(null);
      githubService.findRepository.mockResolvedValue(null);

      await expect(subscribe(email, repo)).rejects.toThrow(NotFoundError);

      expect(repositoryRepository.create).not.toHaveBeenCalled();
    });

    it("Given existing user and new repo, When subscribe is called, Then does not create duplicate user", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({ id: "user-existing" });
      repositoryRepository.findByOwnerRepo.mockResolvedValue(null);
      githubService.findRepository.mockResolvedValue({
        owner_repo: repo,
        latest_tag: "v1",
      });
      repositoryRepository.create.mockResolvedValue({ id: "repo-1" });

      await subscribe(email, repo);

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        "user-existing",
        "repo-1",
        "mocked_hashed_token",
      );
    });

    it("Given existing repo in database, When subscribe is called, Then does not call GitHub API", async () => {
      subscriptionRepository.findByEmailAndRepo.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue({ id: "user-1" });
      repositoryRepository.findByOwnerRepo.mockResolvedValue({
        id: "repo-existing",
      });

      await subscribe(email, repo);

      expect(githubService.findRepository).not.toHaveBeenCalled();
      expect(repositoryRepository.create).not.toHaveBeenCalled();
      expect(subscriptionRepository.create).toHaveBeenCalledWith(
        "user-1",
        "repo-existing",
        "mocked_hashed_token",
      );
    });
  });

  describe("confirmSubscription", () => {
    it("Given valid token, When confirmSubscription is called, Then updates status to active", async () => {
      subscriptionRepository.findByToken.mockResolvedValue({
        id: "sub-1",
        status: "created",
      });

      await confirmSubscription("raw_token_from_email");

      expect(subscriptionRepository.findByToken).toHaveBeenCalledWith(
        "mocked_hashed_token",
        "created",
      );
      expect(subscriptionRepository.updateStatus).toHaveBeenCalledWith(
        "sub-1",
        "active",
      );
    });

    it("Given invalid token, When confirmSubscription is called, Then throws NotFoundError", async () => {
      subscriptionRepository.findByToken.mockResolvedValue(null);

      await expect(confirmSubscription("bad_token")).rejects.toThrow(
        NotFoundError,
      );

      expect(subscriptionRepository.updateStatus).not.toHaveBeenCalled();
    });

    it("Given token with wrong status, When confirmSubscription is called, Then throws NotFoundError", async () => {
      subscriptionRepository.findByToken.mockResolvedValue(null);

      await expect(confirmSubscription("already_active_token")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("unsubscribe", () => {
    it("Given active token, When unsubscribe is called, Then updates status to deactivated", async () => {
      subscriptionRepository.findByToken.mockResolvedValue({
        id: "sub-1",
        status: "active",
      });

      await unsubscribe("raw_token_from_email");

      expect(subscriptionRepository.findByToken).toHaveBeenCalledWith(
        "mocked_hashed_token",
        "active",
      );
      expect(subscriptionRepository.updateStatus).toHaveBeenCalledWith(
        "sub-1",
        "deactivated",
      );
    });

    it("Given invalid token, When unsubscribe is called, Then throws NotFoundError", async () => {
      subscriptionRepository.findByToken.mockResolvedValue(null);

      await expect(unsubscribe("bad_token")).rejects.toThrow(NotFoundError);
    });

    it("Given token with wrong status, When unsubscribe is called, Then throws NotFoundError", async () => {
      subscriptionRepository.findByToken.mockResolvedValue(null);

      await expect(unsubscribe("already_deactivated_token")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getSubscriptions", () => {
    it("Given existing subscriptions, When getSubscriptions is called, Then returns mapped shape with confirmed status", async () => {
      const mockDbRows = [
        {
          email: "a@test.com",
          repo: "req/1",
          status: "active",
          last_seen_tag: "v1",
        },
        {
          email: "a@test.com",
          repo: "req/2",
          status: "created",
          last_seen_tag: null,
        },
      ];
      subscriptionRepository.findByEmail.mockResolvedValue(mockDbRows);

      const result = await getSubscriptions("a@test.com");

      expect(subscriptionRepository.findByEmail).toHaveBeenCalledWith(
        "a@test.com",
      );
      expect(result).toEqual([
        {
          email: "a@test.com",
          repo: "req/1",
          confirmed: true,
          last_seen_tag: "v1",
        },
        {
          email: "a@test.com",
          repo: "req/2",
          confirmed: false,
          last_seen_tag: "",
        },
      ]);
    });

    it("Given no subscriptions, When getSubscriptions is called, Then returns empty array", async () => {
      subscriptionRepository.findByEmail.mockResolvedValue([]);

      const result = await getSubscriptions("nobody@test.com");

      expect(result).toEqual([]);
    });
  });
});
