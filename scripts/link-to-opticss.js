#!/usr/bin/env node
const childProcess = require("child_process");
const path = require("path");
const opticssDir = path.resolve(process.argv[2]);

function getLernaPackageDirs(monoRepoDir) {
  let lernaSpec = require(path.join(monoRepoDir, "lerna.json"));
  let packageSpecs = lernaSpec.packages.map(p => path.join(monoRepoDir, p));
  return childProcess.execSync(`ls -d ${packageSpecs.join(" ")}`, {encoding: "utf8"}).trim().split(/\s+/mg);
}

function getPackageJson(packageDir) {
  return require(path.join(packageDir, "package.json"));
}

const blocksDir = path.resolve(__dirname, "..");
const blocksPackageDirs = getLernaPackageDirs(blocksDir);

let depToPackages = {};

function recordDependencies(deps, dir) {
  if (!deps) return;
  for (let dep of Object.keys(deps)) {
    if (depToPackages[dep] === undefined) {
      depToPackages[dep] = [];
    }
    depToPackages[dep].push(dir);
  }
}

for (let dir of blocksPackageDirs) {
  let pkg = getPackageJson(dir);
  recordDependencies(pkg.dependencies, dir);
  recordDependencies(pkg.devDependencies, dir);
}

for (let dir of getLernaPackageDirs(opticssDir)) {
  let pkg = getPackageJson(dir);
  let name = pkg.name;
  let depDirs = depToPackages[name];
  if (depDirs) {
    try {
      console.log(childProcess.execSync(`cd ${dir} && yarn unlink`, {encoding: "utf8"}));
    } catch (e) {
      //ignore
    }
    console.log(childProcess.execSync(`cd ${dir} && yarn link`, {encoding: "utf8"}));
    console.log(`linking ${name}@${pkg.version} to shared packages`);
    console.log(childProcess.execSync(`cd ${blocksDir} && yarn link ${name}`, {encoding: "utf8"}));
    for (let depDir of depDirs) {
      console.log(`linking ${name}@${pkg.version} to ${path.relative(path.resolve("."), depDir)}`);
      console.log(childProcess.execSync(`cd ${depDir} && yarn link ${name}`, {encoding: "utf8"}));
    }
  }
}