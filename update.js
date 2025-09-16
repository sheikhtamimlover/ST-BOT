
const { execSync } = require('child_process');
const log = require('./logger/log.js');

try {
    log.info("UPDATE", "Starting update process...");
    execSync("node updater.js", { stdio: 'inherit' });
} catch (error) {
    log.error("UPDATE", "Update failed:", error.message);
    process.exit(1);
}
