const fs = require('fs/promises');
const path = require('path');
const { SHARED_IMAGE_DIR, SHARED_PAGE_DIR, ensureSharedAssets } = require('./sharedImageStorage');

const SHARE_TTL_DAYS = 15;
const SHARE_TTL_MS = SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function removeExpiredSharedImages({ logger = console, now = Date.now() } = {}) {
  await ensureSharedAssets();
  const entries = await fs.readdir(SHARED_IMAGE_DIR, { withFileTypes: true });

  const removals = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const filePath = path.join(SHARED_IMAGE_DIR, entry.name);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > SHARE_TTL_MS) {
          await fs.unlink(filePath);
          const pagePath = path.join(
            SHARED_PAGE_DIR,
            `${path.parse(entry.name).name}.html`
          );
          await fs.unlink(pagePath).catch(() => {});
          return entry.name;
        }
        return null;
      })
  );

  const deletedFiles = removals.filter(Boolean);
  if (deletedFiles.length && logger?.info) {
    logger.info(`Shared image cleanup removed ${deletedFiles.length} file(s).`, deletedFiles);
  }

  return deletedFiles;
}

function startSharedImageCleanup(options = {}) {
  const logger = options.logger || console;
  const CLEANUP_HOUR = 23; // 23:00 (11 PM)
  const CLEANUP_MINUTE = 50; // 50 minutes

  const runCleanup = () => {
    removeExpiredSharedImages({ logger }).catch((err) => {
      logger.error?.('Scheduled shared image cleanup failed', err);
    });
  };

  const scheduleNextCleanup = () => {
    const now = new Date();
    let nextCleanup = new Date();

    nextCleanup.setHours(CLEANUP_HOUR, CLEANUP_MINUTE, 0, 0);

    if (now > nextCleanup) {
      // If it's already past today's cleanup time, schedule for tomorrow
      nextCleanup.setDate(nextCleanup.getDate() + 1);
    }

    const delay = nextCleanup.getTime() - now.getTime();

    logger.info(`Next shared image cleanup scheduled at: ${nextCleanup.toLocaleString('th-TH')}`);

    setTimeout(() => {
      // Run the cleanup now
      runCleanup();
      // And then schedule it to run every 24 hours
      setInterval(runCleanup, CLEANUP_INTERVAL_MS);
    }, delay);
  };

  // Run initial cleanup on startup, then start the precise schedule
  runCleanup();
  scheduleNextCleanup();
}

module.exports = {
  startSharedImageCleanup,
  removeExpiredSharedImages,
  SHARE_TTL_MS,
  SHARE_TTL_DAYS,
  CLEANUP_INTERVAL_MS,
};
