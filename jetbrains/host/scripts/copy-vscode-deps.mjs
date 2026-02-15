import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const hostDir = path.resolve(__dirname, "..")
const vscodeSrcRoot = path.resolve(hostDir, "../../deps/vscode/src")
const hostDepsRoot = path.resolve(hostDir, "deps/vscode")

const copyDirs = ["vs", "typings", "vscode-dts"]

for (const dir of copyDirs) {
	const sourceDir = path.join(vscodeSrcRoot, dir)
	const targetDir = path.join(hostDepsRoot, dir)

	if (!fs.existsSync(sourceDir)) {
		throw new Error(`Missing source directory: ${sourceDir}`)
	}

	fs.mkdirSync(path.dirname(targetDir), { recursive: true })
	fs.cpSync(sourceDir, targetDir, { recursive: true, force: true })
}

const requiredFile = path.join(hostDepsRoot, "vs/workbench/api/node/extensionHostProcess.ts")
if (!fs.existsSync(requiredFile)) {
	throw new Error(`Missing copied file: ${requiredFile}`)
}

console.log("Copied VSCode dependency trees into jetbrains/host/deps/vscode")
