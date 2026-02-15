#!/usr/bin/env node

import { cpSync, existsSync, rmSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { spawnSync } from "child_process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const resourcesDir = join(__dirname, "../../resources")
const hostPackageJson = join(__dirname, "../../host/package.json")
const resourcesPackageJson = join(resourcesDir, "package.json")
const resourcesNodeModules = join(resourcesDir, "node_modules")
const resourcesPackageLock = join(resourcesDir, "package-lock.json")

function removeIfExists(path) {
	if (!existsSync(path)) {
		return
	}

	rmSync(path, {
		recursive: true,
		force: true,
		maxRetries: 5,
		retryDelay: 500,
	})
}

function runInstall({ ignoreScripts }) {
	const args = ["install", "--prefix", resourcesDir]

	if (ignoreScripts) {
		args.push("--ignore-scripts")
	}

	const result = spawnSync("npm", args, {
		stdio: "inherit",
		shell: process.platform === "win32",
	})

	return result.status === 0
}

try {
	removeIfExists(resourcesNodeModules)
	removeIfExists(resourcesPackageLock)

	cpSync(hostPackageJson, resourcesPackageJson)

	console.log("Installing JetBrains resource node_modules...")
	if (runInstall({ ignoreScripts: false })) {
		process.exit(0)
	}

	const isWindowsCi = process.platform === "win32" && process.env.CI
	if (!isWindowsCi) {
		process.exit(1)
	}

	console.warn("Normal npm install failed on Windows CI. Retrying with --ignore-scripts.")
	removeIfExists(resourcesNodeModules)
	removeIfExists(resourcesPackageLock)

	if (!runInstall({ ignoreScripts: true })) {
		process.exit(1)
	}
} catch (error) {
	console.error(error)
	process.exit(1)
}
