#!/usr/bin/env node
const childProcess = require("child_process");
const path = require("path");
const fs = require("fs")
let args = process.argv.slice(2);
let opts = {
  hard: false,
  opticssDir: null,
};
function processArg(arg) {
  if (arg === "--hard") {
    opts.hard = true;
  } else if (arg.startsWith("-")) {
    throw new Error(`unrecognize option: ${arg}`);
  } else if (opts.opticssDir === null) {
    opts.opticssDir = path.resolve(arg);
  } else {
    throw new Error(`unrecognize argument: ${arg}`);
  }
}

while (args.length > 0) {
  processArg(args.shift());
}

if (!opts.opticssDir) {
  throw new Error("No directory for opticss provided.");
}

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
let dirToJSON = {}

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
  dirToJSON[dir] = pkg;
  recordDependencies(pkg.dependencies, dir);
  recordDependencies(pkg.devDependencies, dir);
}

function symlink() {
  for (let dir of getLernaPackageDirs(opts.opticssDir)) {
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
}

function setDependencyToFile(name, dependencyDir, dependentDir) {
  let pkg = dirToJSON[dependentDir];
  if (pkg.dependencies[name]) {
    pkg.dependencies[name] = `file:${dependencyDir}`;
  }
  if (pkg.devDependencies[name]) {
    pkg.devDependencies[name] = `file:${dependencyDir}`;
  }
}

function hardlink() {
  for (let depDir of getLernaPackageDirs(opts.opticssDir)) {
    let pkg = getPackageJson(depDir);
    let name = pkg.name;
    let depDirs = depToPackages[name];
    if (depDirs) {
      for (let dir of depDirs) {
        setDependencyToFile(name, depDir, dir)
      }
    }
  }
  for (let dir of blocksPackageDirs) {
    let pkg = dirToJSON[dir];
    let updated = JSON.stringify(pkg, null, 2);
    fs.writeFileSync(path.join(dir,"package.json"), updated);
  }
}

if (opts.hard) {
  hardlink();
} else {
  symlink();
}