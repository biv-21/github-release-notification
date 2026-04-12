const {
  subscriptionRepository,
  userRepository,
  repositoryRepository,
} = require("../repositories");
const { Subscription, User, Repository } = require("../models");
const { ConflictError, NotFoundError } = require("../utils/errors");
const crypto = require("node:crypto");
const githubService = require("./github");
const emailService = require("./email");

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const subscribe = async (email, repo) => {
  const parsedEmail = User.schema.shape.email.parse(email);
  const parsedRepo = Repository.schema.shape.owner_repo.parse(repo);

  const existingSubscription = await subscriptionRepository.findByEmailAndRepo(
    parsedEmail,
    parsedRepo,
  );

  if (
    existingSubscription &&
    ["active", "created"].includes(existingSubscription.status)
  ) {
    throw new ConflictError(
      "This email address is already subscribed to the specified repository or has a pending confirmation.",
    );
  }

  const confirmationToken = crypto.randomBytes(32).toString("base64url");
  const hashedToken = hashToken(confirmationToken);

  if (existingSubscription && existingSubscription.status === "deactivated") {
    const updatedSubscription =
      await subscriptionRepository.updateStatusAndToken(
        existingSubscription.id,
        "created",
        hashedToken,
      );

    await emailService.sendConfirmationEmail(
      parsedEmail,
      parsedRepo,
      confirmationToken,
    );

    return updatedSubscription;
  }

  let user = await userRepository.findByEmail(parsedEmail);
  if (!user) {
    user = await userRepository.create(parsedEmail);
  }

  let dbRepository = await repositoryRepository.findByOwnerRepo(parsedRepo);
  if (!dbRepository) {
    const githubRepository = await githubService.findRepository(parsedRepo);
    if (!githubRepository) {
      throw new NotFoundError(
        "The specified repository could not be found on GitHub. Please verify the owner and repository name.",
      );
    }
    dbRepository = await repositoryRepository.create(
      githubRepository.owner_repo,
      githubRepository.latest_tag,
    );
  }

  const newSubscription = await subscriptionRepository.create(
    user.id,
    dbRepository.id,
    hashedToken,
  );

  await emailService.sendConfirmationEmail(
    parsedEmail,
    parsedRepo,
    confirmationToken,
  );

  return newSubscription;
};

const confirmSubscription = async (token) => {
  const parsedToken = Subscription.schema.shape.token.parse(token);
  const hashedToken = hashToken(parsedToken);

  const pendingSubscription = await subscriptionRepository.findByToken(
    hashedToken,
    "created",
  );
  if (!pendingSubscription) {
    throw new NotFoundError("Token not found");
  }

  await subscriptionRepository.updateStatus(pendingSubscription.id, "active");
};

const unsubscribe = async (token) => {
  const parsedToken = Subscription.schema.shape.token.parse(token);
  const hashedToken = hashToken(parsedToken);

  const activeSubscription = await subscriptionRepository.findByToken(
    hashedToken,
    "active",
  );
  if (!activeSubscription) {
    throw new NotFoundError("Token not found");
  }

  await subscriptionRepository.updateStatus(
    activeSubscription.id,
    "deactivated",
  );
};

const getSubscriptions = async (email) => {
  const parsedEmail = User.schema.shape.email.parse(email);
  const subscriptions = await subscriptionRepository.findByEmail(parsedEmail);

  return subscriptions.map(({ email, repo, status, last_seen_tag }) => ({
    email,
    repo,
    confirmed: status === "active",
    last_seen_tag: last_seen_tag || "",
  }));
};

module.exports = {
  subscribe,
  confirmSubscription,
  unsubscribe,
  getSubscriptions,
};
