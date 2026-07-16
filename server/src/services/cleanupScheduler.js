'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const sessionService = require('./sessionService');

/**
 * Start the in-process background job that purges expired anonymous sessions.
 *
 * Runs once shortly after boot, then on a fixed interval. A run failure is
 * logged and swallowed so a transient DB hiccup never crashes the server or
 * stops future runs. Returns a stop() function (used by tests / shutdown).
 */
function startAnonSessionCleanup() {
  const { cleanupEnabled, cleanupIntervalMs, retentionDays } = config.anonRetention;

  if (!cleanupEnabled) {
    logger.info('Anonymous session cleanup disabled (ANON_SESSION_CLEANUP_ENABLED=false)');
    return () => {};
  }

  const runOnce = async () => {
    try {
      await sessionService.purgeExpiredAnonymousSessions();
    } catch (err) {
      logger.error('Anonymous session cleanup run failed', { error: err.message });
    }
  };

  logger.info('Anonymous session cleanup scheduled', {
    retentionDays,
    intervalMs: cleanupIntervalMs,
  });

  // Kick off an initial sweep a few seconds after boot so startup isn't blocked.
  const initialTimer = setTimeout(runOnce, 5000);
  initialTimer.unref?.();

  const interval = setInterval(runOnce, cleanupIntervalMs);
  interval.unref?.();

  return () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
  };
}

module.exports = { startAnonSessionCleanup };
