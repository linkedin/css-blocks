#!/usr/bin/env node
const childProcess = require("child_process");
const path = require("path");
const fs = require("fs")
let args = process.argv.slice(2);
let opts = {
  mode: null,
  opticssDir: null,
};
function processArg(arg) {
  if (arg === "--hard") {
    opts.mode = "hard";
  } else if (arg === "--version") {
    opts.mode = "version";
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

if (!opts.mode) {
  opts.mode = "symlink"
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

const CSS_BLOCKS_DIR = path.resolve(__dirname, "..");


function recordDependencies(deps, dir, depToPackages) {
  if (!deps) return;
  for (let dep of Object.keys(deps)) {
    if (depToPackages[dep] === undefined) {
      depToPackages[dep] = [];
    }
    depToPackages[dep].push(dir);
  }
  return depToPackages;
}


function analyzeMonorepoDependencies(dirs) {
  let dirToJSON = {};
  let depToPackages = {};
  for (let dir of dirs) {
    let pkg = getPackageJson(dir);
    dirToJSON[dir] = pkg;
    recordDependencies(pkg.dependencies, dir, depToPackages);
    recordDependencies(pkg.devDependencies, dir, depToPackages);
  }

  return {
    dirToJSON,
    depToPackages,
  };
}

function symlink(dependencyPackageDirs, dependentPackageDirs, depToPackages, dirToJSON) {
  for (let dir of dependencyPackageDirs) {
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
      console.log(childProcess.execSync(`cd ${CSS_BLOCKS_DIR} && yarn link ${name}`, {encoding: "utf8"}));
      for (let depDir of depDirs) {
        console.log(`linking ${name}@${pkg.version} to ${path.relative(path.resolve("."), depDir)}`);
        console.log(childProcess.execSync(`cd ${depDir} && yarn link ${name}`, {encoding: "utf8"}));
      }
    }
  }
}

function setDependencyToFile(name, dependencyDir, pkg) {
  if (pkg.dependencies[name]) {
    pkg.dependencies[name] = `link:${dependencyDir}`;
  }
  if (pkg.devDependencies[name]) {
    pkg.devDependencies[name] = `link:${dependencyDir}`;
  }
}

function setDependencyToVersion(name, version, pkg) {
  if (pkg.dependencies[name]) {
    pkg.dependencies[name] = `^${version}`;
  }
  if (pkg.devDependencies[name]) {
    pkg.devDependencies[name] = `^${version}`;
  }
}

function hardlink(dependencyPackageDirs, dependentPackageDirs, depToPackages, dirToJSON) {
  for (let depDir of dependencyPackageDirs) {
    let pkg = getPackageJson(depDir);
    let name = pkg.name;
    let depDirs = depToPackages[name];
    if (depDirs) {
      for (let dir of depDirs) {
        setDependencyToFile(name, path.relative(dir, depDir), dirToJSON[dir])
      }
    }
  }
  for (let dir of dependentPackageDirs) {
    let pkg = dirToJSON[dir];
    let updated = JSON.stringify(pkg, null, 2);
    fs.writeFileSync(path.join(dir,"package.json"), updated);
  }
}

function updateVersions(dependencyPackageDirs, dependentPackageDirs, depToPackages, dirToJSON) {
  for (let depDir of dependencyPackageDirs) {
    let pkg = getPackageJson(depDir);
    let name = pkg.name;
    let version = pkg.version;
    let depDirs = depToPackages[name];
    if (depDirs) {
      for (let dir of depDirs) {
        setDependencyToVersion(name, version, dirToJSON[dir])
      }
    }
  }
  for (let dir of dependentPackageDirs) {
    let pkg = dirToJSON[dir];
    let updated = JSON.stringify(pkg, null, 2);
    fs.writeFileSync(path.join(dir,"package.json"), updated);
  }
}

if (opts.mode === "hard") {
  let blocksDirs = getLernaPackageDirs(CSS_BLOCKS_DIR)
  let opticssDirs = getLernaPackageDirs(opts.opticssDir)
  let blocksDeps = analyzeMonorepoDependencies(blocksDirs);
  let opticssDeps = analyzeMonorepoDependencies(opticssDirs)
  hardlink(opticssDirs, blocksDirs, blocksDeps.depToPackages, blocksDeps.dirToJSON);
  symlink(opticssDirs, blocksDirs, blocksDeps.depToPackages, blocksDeps.dirToJSON);
  hardlink(opticssDirs, opticssDirs, opticssDeps.depToPackages, opticssDeps.dirToJSON);
  symlink(opticssDirs, opticssDirs, opticssDeps.depToPackages, opticssDeps.dirToJSON);
} else if (opts.mode === "version") {
  let blocksDirs = getLernaPackageDirs(CSS_BLOCKS_DIR)
  let opticssDirs = getLernaPackageDirs(opts.opticssDir)
  let blocksDeps = analyzeMonorepoDependencies(blocksDirs);
  updateVersions(opticssDirs, blocksDirs, blocksDeps.depToPackages, blocksDeps.dirToJSON);
} else if (opts.mode === "symlink") {
  let blocksDirs = getLernaPackageDirs(CSS_BLOCKS_DIR)
  let opticssDirs = getLernaPackageDirs(opts.opticssDir)
  let blocksDeps = analyzeMonorepoDependencies(blocksDirs);
  symlink(opticssDirs, blocksDirs, blocksDeps.depToPackages, blocksDeps.dirToJSON);
}