// Shared: launch Chromium via playwright-core. Uses CHROME_PATH or common install paths.
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);

export function launch() {
  const executablePath = CANDIDATES.find((p) => fs.existsSync(p));
  return chromium.launch({ executablePath, args: ['--autoplay-policy=no-user-gesture-required'] });
}
