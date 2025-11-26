const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Add commands to the commands array
const newCommands = [
    {
        "command": "playwright-bdd.generateStepDefinitions",
        "title": "Generate Step Definition",
        "icon": "$(wand)"
    },
    {
        "command": "playwright-bdd.generateAllStepDefinitions",
        "title": "Generate All Step Definitions",
        "icon": "$(wand)"
    }
];

// Find the index of insertScenarioTemplate
const insertScenarioIndex = packageJson.contributes.commands.findIndex(
    cmd => cmd.command === 'playwright-bdd.insertScenarioTemplate'
);

if (insertScenarioIndex !== -1) {
    // Insert after insertScenarioTemplate
    packageJson.contributes.commands.splice(insertScenarioIndex + 1, 0, ...newCommands);
    console.log('✅ Added commands to commands array');
} else {
    console.log('❌ Could not find insertScenarioTemplate command');
}

// Add to editor context menu
const editorContext = packageJson.contributes.menus['editor/context'];
if (editorContext) {
    const newMenuItems = [
        {
            "command": "playwright-bdd.generateStepDefinitions",
            "when": "resourceExtname == .feature",
            "group": "bdd@5"
        },
        {
            "command": "playwright-bdd.generateAllStepDefinitions",
            "when": "resourceExtname == .feature",
            "group": "bdd@6"
        }
    ];

    // Find formatFeatureFile and add after it
    const formatIndex = editorContext.findIndex(
        item => item.command === 'playwright-bdd.formatFeatureFile'
    );

    if (formatIndex !== -1) {
        editorContext.splice(formatIndex + 1, 0, ...newMenuItems);
        console.log('✅ Added commands to editor context menu');
    } else {
        // Just append to the end
        editorContext.push(...newMenuItems);
        console.log('✅ Appended commands to editor context menu');
    }
}

// Write back to package.json with proper formatting
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ Successfully updated package.json');
