#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const command = process.argv[2] || "status";
const workspaceRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(workspaceRoot, "package.json");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
const tagName = `v${version}`;

const run = (commandText, options = {}) =>
  execSync(commandText, {
    cwd: workspaceRoot,
    stdio: options.stdio ?? "pipe",
    encoding: "utf8"
  }).trim();

const hasCleanWorkingTree = () => run("git status --short").length === 0;
const localTagExists = () => run(`git tag --list ${tagName}`) === tagName;
const remoteTagExists = () => run(`git ls-remote --tags origin refs/tags/${tagName}`).length > 0;

const printStatus = () => {
  console.log(`Domizan release yardimcisi`);
  console.log(`- Guncel surum: ${version}`);
  console.log(`- Beklenen tag: ${tagName}`);
  console.log(`- Calisma agaci temiz: ${hasCleanWorkingTree() ? "evet" : "hayir"}`);
  console.log(`- Local tag var: ${localTagExists() ? "evet" : "hayir"}`);
  console.log(`- Remote tag var: ${remoteTagExists() ? "evet" : "hayir"}`);
  console.log("");
  console.log("Onerilen akis:");
  console.log(`1. git add .`);
  console.log(`2. git commit -m "Release ${tagName}"`);
  console.log(`3. git push origin main`);
  console.log(`4. npm run release:publish-tag`);
};

const ensureCleanWorkingTree = () => {
  if (!hasCleanWorkingTree()) {
    throw new Error(
      "Release tag olusturmadan once calisma agaci temiz olmali. Once commit veya stash alin."
    );
  }
};

const createTag = () => {
  ensureCleanWorkingTree();

  if (localTagExists()) {
    console.log(`${tagName} local olarak zaten var.`);
    return;
  }

  execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, {
    cwd: workspaceRoot,
    stdio: "inherit"
  });
  console.log(`${tagName} local olarak olusturuldu.`);
};

const pushTag = () => {
  ensureCleanWorkingTree();

  if (!localTagExists()) {
    throw new Error(`${tagName} local tag bulunamadi. Once npm run release:tag calistirin.`);
  }

  if (remoteTagExists()) {
    console.log(`${tagName} origin uzerinde zaten var.`);
    return;
  }

  execSync(`git push origin ${tagName}`, {
    cwd: workspaceRoot,
    stdio: "inherit"
  });
  console.log(`${tagName} origin'e gonderildi.`);
};

const publishTag = () => {
  if (!localTagExists()) {
    createTag();
  }

  pushTag();
};

try {
  switch (command) {
    case "status":
      printStatus();
      break;
    case "create-tag":
      createTag();
      break;
    case "push-tag":
      pushTag();
      break;
    case "publish-tag":
      publishTag();
      break;
    default:
      throw new Error(
        `Bilinmeyen komut: ${command}. Kullanilabilir komutlar: status, create-tag, push-tag, publish-tag`
      );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Beklenmeyen release yardimci hatasi.");
  process.exitCode = 1;
}
