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
  if (arg === "--file") {
    opts.mode = "file";
  } else if (arg === "--hardlink") {
    opts.mode = "link";
  } else if (arg === "--symlink") {
    opts.mode = "symlink";
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

    try {
      console.log(childProcess.execSync(`cd ${dir} && yarn unlink`, {encoding: "utf8"}));
    } catch (e) {
      //ignore
    }
    console.log(childProcess.execSync(`cd ${dir} && yarn link`, {encoding: "utf8"}));
    console.log(`linking ${name}@${pkg.version} to shared packages`);
    console.log(childProcess.execSync(`cd ${CSS_BLOCKS_DIR} && yarn link ${name}`, {encoding: "utf8"}));

    // let depDirs = depToPackages[name];
    // if (depDirs) {
    //   for (let depDir of depDirs) {
    //     console.log(`linking ${name}@${pkg.version} to ${path.relative(path.resolve("."), depDir)}`);
    //     console.log(childProcess.execSync(`cd ${depDir} && yarn link ${name}`, {encoding: "utf8"}));
    //   }
    // }
  }
}

function setExistingDependency(deps, name, value) {
  if (deps && deps[name]) {
    deps[name] = value;
  }
}

function setDependencyToFile(protocol, name, dependencyDir, pkg) {
  let newValue = `${protocol}:${dependencyDir}`;
  setExistingDependency(pkg.dependencies, name, newValue);
  setExistingDependency(pkg.devDependencies, name, newValue);
}

function setDependencyToVersion(name, version, pkg) {
  let newVersion = `^${version}`;
  setExistingDependency(pkg.dependencies, name, newVersion);
  setExistingDependency(pkg.devDependencies, name, newVersion);
}

function updatePackageJsons(protocol, dependencyPackageDirs, dependentPackageDirs, depToPackages, dirToJSON) {
  for (let depDir of dependencyPackageDirs) {
    let pkg = getPackageJson(depDir);
    let name = pkg.name;
    let version = pkg.version;
    let depDirs = depToPackages[name];
    if (depDirs) {
      for (let dir of depDirs) {
        if (protocol === "file" || protocol == "link") {
          setDependencyToFile(protocol, name, path.relative(dir, depDir), dirToJSON[dir])
        } else if (protocol === "version") {
          setDependencyToVersion(name, version, dirToJSON[dir])
        }
      }
    }
  }
  for (let dir of dependentPackageDirs) {
    let pkg = dirToJSON[dir];
    let updated = JSON.stringify(pkg, null, 2);
    fs.writeFileSync(path.join(dir,"package.json"), updated);
  }
}

if (opts.mode === "file" || opts.mode === "link" || opts.mode === "version") {
  let blocksDirs = getLernaPackageDirs(CSS_BLOCKS_DIR)
  let opticssDirs = getLernaPackageDirs(opts.opticssDir)
  let blocksDeps = analyzeMonorepoDependencies(blocksDirs);
  let opticssDeps = analyzeMonorepoDependencies(opticssDirs)
  updatePackageJsons(opts.mode, opticssDirs, blocksDirs, blocksDeps.depToPackages, blocksDeps.dirToJSON);
  updatePackageJsons(opts.mode, opticssDirs, opticssDirs, opticssDeps.depToPackages, opticssDeps.dirToJSON);
} else if (opts.mode === "symlink") {
  let blocksDirs = getLernaPackageDirs(CSS_BLOCKS_DIR)
  let opticssDirs = getLernaPackageDirs(opts.opticssDir)
  let blocksDeps = analyzeMonorepoDependencies(blocksDirs);
  symlink(opticssDirs, blocksDirs, blocksDeps.depToPackages, blocksDeps.dirToJSON);
}