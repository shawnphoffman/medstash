#!/usr/bin/env node

/**
 * Version bumping script with git integration
 * Uses npm version but handles uncommitted changes gracefully
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const packageJsonPath = path.join(__dirname, '..', 'package.json')
const versionType = process.argv[2] || 'patch' // patch, minor, major

if (!['patch', 'minor', 'major'].includes(versionType)) {
	console.error(`Invalid version type: ${versionType}`)
	console.error('Usage: node scripts/version.js [patch|minor|major] [--force|--no-git]')
	process.exit(1)
}

// Check if git is available
let gitAvailable = true
try {
	execSync('git --version', { stdio: 'ignore' })
} catch {
	gitAvailable = false
	console.warn('Warning: git not found. Version will be updated in package.json only.')
}

// Check git status - filter out package.json and package-lock.json since those will be updated
let hasUncommittedChanges = false
let hasOtherUncommittedChanges = false
let gitStatus = ''
let otherChanges = ''
if (gitAvailable) {
	try {
		gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim()
		hasUncommittedChanges = gitStatus.length > 0

		// Filter out package.json, package-lock.json, and version.ts changes
		// These are expected to be modified by the version script
		const lines = gitStatus.split('\n').filter(line => line.trim())
		const otherLines = lines.filter(line => {
			const file = line.substring(3).trim()
			return file !== 'package.json' && file !== 'package-lock.json' && file !== 'frontend/src/lib/version.ts'
		})
		hasOtherUncommittedChanges = otherLines.length > 0
		otherChanges = otherLines.join('\n')
	} catch {
		// Not a git repo or other error
		gitAvailable = false
	}
}

// Read current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
const currentVersion = packageJson.version

// Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number)
let newVersion
switch (versionType) {
	case 'major':
		newVersion = `${major + 1}.0.0`
		break
	case 'minor':
		newVersion = `${major}.${minor + 1}.0`
		break
	case 'patch':
	default:
		newVersion = `${major}.${minor}.${patch + 1}`
		break
}

console.log(`Current version: ${currentVersion}`)
console.log(`New version: ${newVersion}`)

const forceFlag = process.argv.includes('--force')
const noGitFlag = process.argv.includes('--no-git')

// Only warn about OTHER uncommitted changes (not package.json/package-lock.json)
// Those files will be updated by npm version, which is expected
if (hasOtherUncommittedChanges && !forceFlag && !noGitFlag) {
	console.log('\n⚠️  Warning: You have uncommitted changes in other files:')
	console.log(otherChanges)
	console.log('\nOptions:')
	console.log('1. Commit or stash your changes first, then run this script again')
	console.log('2. Use --force flag to proceed anyway (will commit only package.json, package-lock.json, and version.ts)')
	console.log('3. Use --no-git flag to update files only (no git commit/tag)')
	console.error('\n❌ Aborting. Please commit or stash your changes first.')
	process.exit(1)
}

if (hasOtherUncommittedChanges && forceFlag) {
	console.log('\n⚠️  Proceeding with --force flag (will commit only package.json, package-lock.json, and version.ts)...')
}

if (noGitFlag) {
	console.log('\n📝 Updating package.json only (no git operations)...')
	gitAvailable = false
}

	// Manually update package.json, package-lock.json, and version.ts
	// This avoids npm version's requirement for a clean working directory
	try {
		const packageLockPath = path.join(__dirname, '..', 'package-lock.json')
		const versionTsPath = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'version.ts')

		// Update package.json
		packageJson.version = newVersion
		fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')
		console.log(`✅ Updated package.json to version ${newVersion}`)

		// Update package-lock.json if it exists
		if (fs.existsSync(packageLockPath)) {
			try {
				const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'))
				packageLock.version = newVersion
				// Also update the root package version in the lock file
				if (packageLock.packages && packageLock.packages['']) {
					packageLock.packages[''].version = newVersion
				}
				fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + '\n')
				console.log(`✅ Updated package-lock.json to version ${newVersion}`)
			} catch (lockError) {
				console.warn('⚠️  Warning: Could not update package-lock.json:', lockError.message)
				console.warn('   You may need to run "npm install" to update the lock file.')
			}
		}

		// Update version.ts if it exists
		if (fs.existsSync(versionTsPath)) {
			try {
				let versionTsContent = fs.readFileSync(versionTsPath, 'utf-8')
				// Replace the VERSION constant with the new version
				versionTsContent = versionTsContent.replace(
					/export const VERSION = ['"](.*?)['"]/,
					`export const VERSION = '${newVersion}'`
				)
				fs.writeFileSync(versionTsPath, versionTsContent)
				console.log(`✅ Updated frontend/src/lib/version.ts to version ${newVersion}`)
			} catch (versionTsError) {
				console.warn('⚠️  Warning: Could not update version.ts:', versionTsError.message)
			}
		}

		// Handle git operations manually if needed
		if (gitAvailable && !noGitFlag) {
			try {
				// Stage package.json, package-lock.json, and version.ts
				const filesToStage = ['package.json', 'package-lock.json']
				if (fs.existsSync(versionTsPath)) {
					filesToStage.push('frontend/src/lib/version.ts')
				}
				execSync(`git add ${filesToStage.join(' ')}`, { stdio: 'inherit' })

				// Create commit
				const commitMessage = `chore: bump version to ${newVersion}`
				execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' })
				console.log(`✅ Created git commit: ${commitMessage}`)

				// Create tag
				execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`, { stdio: 'inherit' })
				console.log(`✅ Created git tag: v${newVersion}`)
			} catch (gitError) {
				console.error('\n❌ Error during git operations:', gitError.message)
				console.log('\nVersion was updated in package.json, but git operations failed.')
				process.exit(1)
			}
		}
} catch (error) {
	console.error('\n❌ Error updating version:', error.message)
	process.exit(1)
}

if (gitAvailable && !noGitFlag) {
	console.log(`\n🎉 Version ${newVersion} released!`)
	console.log(`\nTo push to remote:`)
	console.log(`  git push && git push --tags`)
} else if (noGitFlag) {
	console.log(`\n📝 Version updated in package.json. Git operations skipped.`)
}
