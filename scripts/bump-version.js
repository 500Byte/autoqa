#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const bumpType = args[0];

const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

let currentVersion = packageJson.version;
let baseVersion = currentVersion;
let prereleaseNumber = 0;

// Extraer versión base y número de pre-release si existe
const betaMatch = currentVersion.match(/^(\d+\.\d+\.\d+)-beta\.(\d+)$/);
if (betaMatch) {
    baseVersion = betaMatch[1];
    prereleaseNumber = parseInt(betaMatch[2], 10);
}

const [major, minor, patch] = baseVersion.split('.').map(Number);

let newVersion;
let isPrerelease = false;

switch (bumpType) {
    case 'prerelease':
        prereleaseNumber += 1;
        newVersion = `${baseVersion}-beta.${prereleaseNumber}`;
        isPrerelease = true;
        console.log(`Creando pre-release: ${newVersion}`);
        break;

    case 'patch':
        newVersion = `${major}.${minor}.${patch + 1}`;
        console.log(`Patch release: ${newVersion}`);
        break;

    case 'minor':
        newVersion = `${major}.${minor + 1}.0`;
        console.log(`Minor release: ${newVersion}`);
        break;

    case 'major':
        newVersion = `${major + 1}.0.0`;
        console.log(`Major release: ${newVersion}`);
        break;

    case 'auto':
        const { execSync } = require('child_process');

        try {
            const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""')
                .toString().trim();

            const commits = lastTag
                ? execSync(`git log ${lastTag}..HEAD --oneline`).toString()
                : execSync('git log --oneline').toString();

            const hasBreaking = /BREAKING CHANGE|!:/i.test(commits);
            const hasFeat = /^[a-f0-9]+\s+feat(\(.*?\))?:/m.test(commits);
            const hasFix = /^[a-f0-9]+\s+fix(\(.*?\))?:/m.test(commits);

            if (hasBreaking) {
                newVersion = `${major + 1}.0.0`;
                console.log(`BREAKING CHANGE detectado -> Major: ${newVersion}`);
            } else if (hasFeat) {
                newVersion = `${major}.${minor + 1}.0`;
                console.log(`Nuevas funcionalidades detectadas -> Minor: ${newVersion}`);
            } else if (hasFix) {
                newVersion = `${major}.${minor}.${patch + 1}`;
                console.log(`Correcciones detectadas -> Patch: ${newVersion}`);
            } else {
                newVersion = `${major}.${minor}.${patch + 1}`;
                console.log(`Cambios detectados -> Patch: ${newVersion}`);
            }
        } catch (error) {
            console.error('Error analizando commits:', error.message);
            process.exit(1);
        }
        break;

    default:
        console.error('Tipo de incremento invalido. Use: auto, prerelease, patch, minor, major');
        process.exit(1);
}

packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

try {
    const lockPath = path.join(process.cwd(), 'package-lock.json');
    if (fs.existsSync(lockPath)) {
        const packageLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        packageLock.version = newVersion;
        if (packageLock.packages && packageLock.packages['']) {
            packageLock.packages[''].version = newVersion;
        }
        fs.writeFileSync(lockPath, JSON.stringify(packageLock, null, 2) + '\n');
    }
} catch (err) {
    console.warn('No se pudo actualizar package-lock.json');
}

console.log(`\nVersion: ${newVersion}`);
console.log(`Pre-release: ${isPrerelease}`);

if (!isPrerelease) {
    console.log(`
Version actualizada correctamente.

Siguientes pasos:
1. Revisar cambios en CHANGELOG.md
2. Commit: git add . && git commit -m "chore: release v${newVersion}"
3. Tag: git tag -a v${newVersion} -m "Release v${newVersion}"
4. Push: git push && git push --tags
  `);
}