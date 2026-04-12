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
    logger.warn("Scanner skipped: previous run still in progress.");
    return;
  }
  isRunning = true;
  const startTime = Date.now();
  logger.info("Scanner started.");

  try {
    const repositories =
      await repositoryRepository.findAllWithActiveSubscriptions();
    logger.info(`Found ${repositories.length} repositories to scan.`);

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
            logger.info(
              `New release detected: ${sourceRepo.owner_repo} [${sourceRepo.last_seen_tag || "none"} -> ${githubData.latest_tag}]`,
            );
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
              logger.info(
                `Sent release notifications to ${emails.length} subscribers for ${sourceRepo.owner_repo}.`,
              );
            }
          }

          logger.debug(`Checked ${sourceRepo.owner_repo}`);
        }
      } catch (batchError) {
        logger.error(`Batch failed: ${batchError.message}`);
      }
    }
    const duration = Date.now() - startTime;
    logger.info(`Scanner completed successfully in ${duration}ms.`);
  } catch (error) {
    logger.error(`Critical scanner error: ${error.message}`);
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
  runScan,
};
