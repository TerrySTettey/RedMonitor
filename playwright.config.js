import {defineConfig} from '@playwright/test';
const preview = process.env.REDMONITOR_PREVIEW === '1';
const port = preview ? 5174 : 5173;
export default defineConfig({
 testDir:'./tests/browser', timeout:60000,
 use:{baseURL:`http://127.0.0.1:${port}`,headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']}},
 webServer:{command:`npm run ${preview?'preview':'dev'} -- --port ${port}`,url:`http://127.0.0.1:${port}`,reuseExistingServer:true},
});
