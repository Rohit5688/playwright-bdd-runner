import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig, cucumberReporter } from 'playwright-bdd';

const testDir = defineBddConfig({
    features: 'src/features/*.feature',
    steps: 'src/steps/*.ts',
});

export default defineConfig({
    testDir,
    reporter: [
        cucumberReporter('html', {
            outputFile: 'cucumber-report/index.html',
            externalAttachments: true,
        }),
        ['html', { open: 'never' }],
    ],
    use: {
        screenshot: 'on',
        trace: 'on',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});