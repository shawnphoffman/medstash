#!/usr/bin/env node

/**
 * Version bumping script with git integration
 * Handles uncommitted changes gracefully
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionType = process.argv[2] || 'patch'; // patch, minor, major

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error(`Invalid version type: ${versionType}`);
  console.error('Usage: node scripts/version.js [patch|minor|major]');
  process.exit(1);
}

// Check if git is available
let gitAvailable = true;
try {
  execSync('git --version', { stdio: 'ignore' });
} catch {
  gitAvailable = false;
  console.warn('Warning: git not found. Version will be updated in package.json only.');
}

// Check git status
let hasUncommittedChanges = false;
let gitStatus = '';
if (gitAvailable) {
  try {
    gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    hasUncommittedChanges = gitStatus.length > 0;
  } catch {
    // Not a git repo or other error
    gitAvailable = false;
  }
}

// Read current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

// Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`Current version: ${currentVersion}`);
console.log(`New version: ${newVersion}`);

if (hasUncommittedChanges) {
  console.log('\n⚠️  Warning: You have uncommitted changes:');
  console.log(gitStatus);
  console.log('\nOptions:');
  console.log('1. Commit or stash your changes first, then run this script again');
  console.log('2. Use --force flag to proceed anyway (not recommended)');
  console.log('3. Use --no-git flag to update package.json only (no git commit/tag)');
  
  const forceFlag = process.argv.includes('--force');
  const noGitFlag = process.argv.includes('--no-git');
  
  if (forceFlag) {
    console.log('\n⚠️  Proceeding with --force flag...');
  } else if (noGitFlag) {
    console.log('\n📝 Updating package.json only (no git operations)...');
    gitAvailable = false;
  } else {
    console.error('\n❌ Aborting. Please commit or stash your changes first.');
    process.exit(1);
  }
}

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
console.log(`✅ Updated package.json to version ${newVersion}`);

// Git operations
if (gitAvailable) {
  try {
    // Stage package.json
    execSync('git add package.json', { stdio: 'inherit' });
    
    // Create commit
    const commitMessage = `chore: bump version to ${newVersion}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log(`✅ Created git commit: ${commitMessage}`);
    
    // Create tag
    execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`, { stdio: 'inherit' });
    console.log(`✅ Created git tag: v${newVersion}`);
    
    console.log(`\n🎉 Version ${newVersion} released!`);
    console.log(`\nTo push to remote:`);
    console.log(`  git push && git push --tags`);
  } catch (error) {
    console.error('\n❌ Error during git operations:', error.message);
    console.log('\nVersion was updated in package.json, but git operations failed.');
    process.exit(1);
  }
} else {
  console.log(`\n📝 Version updated in package.json. Git operations skipped.`);
}
