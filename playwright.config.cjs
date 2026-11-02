const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './test/browser',
    fullyParallel: false,
    use: { baseURL: 'http://127.0.0.1:18763', trace: 'retain-on-failure' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } }
    ],
    webServer: { command: 'node test/browser-server.cjs', port: 18763, reuseExistingServer: false }
});
