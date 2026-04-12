const cron = require("node-cron");
const {
  repositoryRepository,
  subscriptionRepository,
} = require("../repositories");
const { githubService, emailService } = require("../services");
const logger = require("../utils/logger");
const config = require("../config");

const BATCH_SIZE = 50;

let isRunning = false;

const runScan = async () => {
  if (isRunning) {
    logger.warn("Previous scan still running, skipping");
    return;
  }
  isRunning = true;

  try {
    const repositories =
      await repositoryRepository.findAllWithActiveSubscriptions();

    for (let index = 0; index < repositories.length; index += BATCH_SIZE) {
      const batch = repositories.slice(index, index + BATCH_SIZE);
      const mappedBatch = batch.map((repo) => {
        const [owner, name] = repo.owner_repo.split("/");
        return { id: repo.id, owner, name, sourceRepo: repo };
      });

      try {
        const results = await githubService.findRepositoriesBatch(mappedBatch);

        for (const githubData of results) {
          const sourceRepo = mappedBatch.find(
            (repo) => repo.id === githubData.id,
          ).sourceRepo;

          if (
            githubData.latest_tag &&
            githubData.latest_tag !== sourceRepo.last_seen_tag
          ) {
            await repositoryRepository.updateLastSeenTag(
              sourceRepo.id,
              githubData.latest_tag,
            );

            const emails =
              await subscriptionRepository.findActiveEmailsByRepoId(
                sourceRepo.id,
              );

            if (emails.length > 0) {
              await emailService.sendNewReleaseEmail(
                emails,
                sourceRepo.owner_repo,
                githubData.latest_tag,
              );
            }
          }

          logger.info("checked", sourceRepo.id);
        }
      } catch (batchError) {
        logger.error(batchError);
      }
    }
  } catch (error) {
    logger.error(error);
  } finally {
    isRunning = false;
  }
};

const startScanner = () => {
  const scannerCron = config.app.scannerCron;
  cron.schedule(scannerCron, () => {
    runScan().catch((err) =>
      logger.error(`Unhandled scanner error: ${err.message}`),
    );
  });
  logger.info(`Scanner scheduled with cron: ${scannerCron}`);
};

module.exports = {
  startScanner,
};
