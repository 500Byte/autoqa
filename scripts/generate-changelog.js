#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

const version = process.argv[2];
if (!version) {
    console.error('Uso: node generate-changelog.js <version>');
    process.exit(1);
}

try {
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""')
        .toString().trim();

    const gitLog = lastTag
        ? execSync(`git log ${lastTag}..HEAD --pretty=format:"%s|%h|%an|%ad" --date=short`)
        : execSync('git log --pretty=format:"%s|%h|%an|%ad" --date=short');

    const commits = gitLog.toString().split('\n').filter(Boolean);

    const features = [];
    const fixes = [];
    const breaking = [];
    const others = [];

    commits.forEach(commit => {
        const [message, hash, author, date] = commit.split('|');

        if (message.includes('BREAKING CHANGE') || message.includes('!:')) {
            breaking.push({ message, hash, author, date });
        } else if (message.startsWith('feat')) {
            features.push({ message: message.replace(/^feat:?\s*/, ''), hash });
        } else if (message.startsWith('fix')) {
            fixes.push({ message: message.replace(/^fix:?\s*/, ''), hash });
        } else {
            others.push({ message, hash });
        }
    });

    const today = new Date().toISOString().split('T')[0];
    let changelogEntry = `\n## [${version}] - ${today}\n\n`;

    if (breaking.length > 0) {
        changelogEntry += `### BREAKING CHANGES\n\n`;
        breaking.forEach(c => {
            changelogEntry += `- ${c.message} ([${c.hash}])\n`;
        });
        changelogEntry += '\n';
    }

    if (features.length > 0) {
        changelogEntry += `### Nuevas Funcionalidades\n\n`;
        features.forEach(c => {
            changelogEntry += `- ${c.message} ([${c.hash}])\n`;
        });
        changelogEntry += '\n';
    }

    if (fixes.length > 0) {
        changelogEntry += `### Correcciones\n\n`;
        fixes.forEach(c => {
            changelogEntry += `- ${c.message} ([${c.hash}])\n`;
        });
        changelogEntry += '\n';
    }

    if (others.length > 0) {
        changelogEntry += `### Otros Cambios\n\n`;
        others.forEach(c => {
            changelogEntry += `- ${c.message} ([${c.hash}])\n`;
        });
        changelogEntry += '\n';
    }

    const changelogPath = 'CHANGELOG.md';
    let changelog = fs.existsSync(changelogPath)
        ? fs.readFileSync(changelogPath, 'utf8')
        : `# Changelog\n\nTodos los cambios importantes de AutoQA se documentan en este archivo.\n\n## [Unreleased]\n`;

    const unreleasedIndex = changelog.indexOf('## [Unreleased]');
    if (unreleasedIndex !== -1) {
        const insertPoint = changelog.indexOf('\n', unreleasedIndex) + 1;
        changelog = changelog.slice(0, insertPoint) + changelogEntry + changelog.slice(insertPoint);
    } else {
        changelog += changelogEntry;
    }

    fs.writeFileSync(changelogPath, changelog);
    console.log(`CHANGELOG.md actualizado para version ${version}`);
    console.log(changelogEntry);

} catch (error) {
    console.error('Error generando changelog:', error.message);
    process.exit(1);
}
