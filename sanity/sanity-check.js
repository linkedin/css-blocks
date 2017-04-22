var postcss = require("postcss");
var shorthandExpand = require('postcss-shorthand-expand');
var fs = require("fs");
var path = require("path");
var process = require("process");
var crypto = require("crypto");
var cssSize = require("css-size");
var autoprefixer = require("autoprefixer");
var unprefix = require("postcss-unprefix");
var removePrefixes = require("postcss-remove-prefixes");
var selectorParser = require("postcss-selector-parser");

var regexpu = require("regexpu-core");
var legalClassName = new RegExp(regexpu("((?:\\\\.|[A-Za-z_\\-\\u{00a0}-\\u{10ffff}])(?:\\\\.|[A-Za-z_\\-0-9\\u{00a0}-\\u{10ffff}])*)", "u"));


var brotliDict = [];
function loadBrotliDict() {
  try {
  var entries = fs.readFileSync(path.join(__dirname, "brotli.dict.txt")).toString().split("\n");
  entries.forEach(function (e) {
    if (legalClassName.test(e)) {
      brotliDict.push(e);
    }
  });
  } catch(e) {
    console.error(e);
    throw e;
  }
}


var nextClassGenerator = function(start) {
  var counter = start;
  return function() {
    if (brotliDict.length > 0) {
      return "." + brotliDict.shift();
    } else {
      counter = counter + 1;
      return ".c" + counter.toString(36);
    }
  }
}

const secret = 'for everyone';


function makeContentClassGenerator(length, fallbackGenerator) {
  var existing = new Set();
  return function(scope, pseudo, prop, value) {
    if (!scope) {
      return fallbackGenerator();
    }
    var hmac = crypto.createHmac('sha256', secret)
                     .update(scope)
                     .update(pseudo)
                     .update(prop)
                     .update(value);
    var hash = hmac.digest("hex");
    var numberMatch = hash.match(/^\d+/);
    if (numberMatch) {
      hash = hash.slice(numberMatch[0].length, numberMatch[0].length + length);
    } else {
      hash = hash.slice(0, length);
    }
    if (existing.has(hash)) {
      throw new Error("Hash collision. Set hash length larger than " + length);
    }
    if (!legalClassName.test(hash)) {
      throw new Error("This isn't a valid classname: " + hash);
    }
    existing.add(hash);
    console.log(hash);
    return hash;
  }
}

function getNestedBEMSelectorContext(selector) {
  var parsed = selectorParser().process(selector);
  var primarySelector = parsed.res.nodes[0]
  var classCount = 0;
  var blockModifier;
  primarySelector.each(function(s) {
    if (s.type === "class") {
      if (isBlockModifier(s.value)) {
        blockModifier = s.value;
      }
      classCount++;
    }
  });
  if (classCount > 1 && blockModifier) {
    console.log(blockModifier, "found in", selector)
    return blockModifier;
  }
}

function addScopedDecl(scopedDecls, blockModifiers, pseudo, node) {
  var selectorScope = getNestedBEMSelectorContext(node.parent.selector);
  if (selectorScope) {
    selectorScope = blockModifiers[selectorScope];
  } else {
    selectorScope = "";
  }
  if (!scopedDecls[selectorScope]) {
    scopedDecls[selectorScope] = {}
  }
  scopedDecls = scopedDecls[selectorScope]

  if (!scopedDecls[pseudo]) {
    scopedDecls[pseudo] = {};
  }
  scopedDecls = scopedDecls[pseudo]

  if (!scopedDecls[node.prop]) {
    scopedDecls[node.prop] = new Set();
  }

  scopedDecls[node.prop].add(node.value);
}

function addBaseDecl(decls, blockModifiers, pseudo, node) {
  if (!decls["base"]) {
    decls["base"] = {};
  }
  addScopedDecl(decls["base"], blockModifiers, pseudo, node);
}

function addAtRuleDecl(decls, blockModifiers, pseudo, node, atrule) {
  var scope = "@" + atrule.name + " " + atrule.params + " {}";
  if (!decls[scope]) {
    decls[scope] = {};
  }
  addScopedDecl(decls[scope], blockModifiers, pseudo, node);
}

function insertOptimizedDecls(classGenerator, container, decls, scope) {
  try {
  var anchor;
  var selectorScopes = Object.keys(decls[scope]);
  selectorScopes.forEach(function(nestingSelector) {
    var pseudos = Object.keys(decls[scope][nestingSelector]);
    pseudos.forEach(function(pseudo) {
      var props = Object.keys(decls[scope][nestingSelector][pseudo]);
      props.forEach(function(p) {
        decls[scope][nestingSelector][pseudo][p].forEach(function(v) {
          var sel = classGenerator(scope, pseudo, p, v) + pseudo;
          if (nestingSelector.length > 0) {
            sel = nestingSelector + " " + sel;
          }
          var rule = postcss.rule({selector: sel});
          rule.append(postcss.decl({prop: p, value: v}));
          if (!anchor) {
            container.prepend(rule);
            anchor = rule
          } else {
            container.insertAfter(anchor, rule);
            anchor = rule;
          }
        });
      });
    });
  });

  return anchor
  } catch(e) {
    console.error(e);
    throw e;
  }
}

function extractPseudos(rule) {
  var pseudos = [];
  var selectorProcessor = selectorParser();
  var processed = selectorProcessor.process(rule.selector)
  var firstSelector = processed.res.nodes[0]; // because of how we use mixins, pseudos tend to be repeated across several selectors so we just grab the first.
  firstSelector.each(function(s) {
    if (s.type === "pseudo") {
      pseudos.push(s);
    }
  });
  pseudos.sort(); // this probably sorts pseudoelements before pseudoclasses which is invalid but all we need right now is a consistent order
  return pseudos.join('');
}

function shouldSkipDecl(node) {
  return node.important || (
           node.parent && node.parent.parent &&
           node.parent.parent.type == "atrule" && node.parent.parent.name.match(/keyframes/)
         );
}

function isBlockModifier(aClassSelector) {
  return (/--/.test(aClassSelector) && !/__/.test(aClassSelector));
}

var compactor = postcss.plugin('compactor', function myplugin(options) {

    var blockModifiers = {};
    var classGenerator = nextClassGenerator(0);
    //var classGenerator = makeContentClassGenerator(8, classGenerator);

    var selectorScopeExtractor = selectorParser(function(selectors) {
      selectors.walkClasses(function(aClassSelector) {
        if (isBlockModifier(aClassSelector.value)) {
          if (!(aClassSelector.value in blockModifiers)) {
            blockModifiers[aClassSelector.value] = classGenerator();
          }
        }
      });
    });

    return function (css) {
      var decls = {};
      options = options || {};
      if (options.useBrotliDictionary) {
        loadBrotliDict();
      }
      css.walkRules(function(rule) {
        selectorScopeExtractor.process(rule.selector);
      });

      css.walkDecls(function(node, idx) {
        if (shouldSkipDecl(node)) {
          //console.warn("not optimizing: " + node.toString());
        } else {
          var rule = node.parent;
          var pseudos = extractPseudos(rule);
          var atrule;
          if (node.parent.parent.type == "atrule") {
            atrule = node.parent.parent;
            addAtRuleDecl(decls, blockModifiers, pseudos, node, atrule);
          } else {
            addBaseDecl(decls, blockModifiers, pseudos, node);
          }
          node.remove();
          if (!rule.first) {
            rule.remove();
          }
          if (atrule && !atrule.first) {
            atrule.remove();
          }
        }
      });
      var anchor = insertOptimizedDecls(classGenerator, css, decls, "base");
      Object.keys(decls).forEach(function(scope) {
        if (scope != "base") {
          var atrule = postcss.parse(scope).first;
          insertOptimizedDecls(classGenerator, atrule, decls, scope);
          //console.log("<<<<<");
          //console.log(atrule.toString());
          //console.log(">>>>>");
          atrule.moveAfter(anchor);
          anchor = atrule;
        }
      });
    };
});


var input = fs.readFileSync(process.argv[2])

var compactorOpts = {
  useBrotliDictionary: false
}

cssSize.table(input, compactorOpts, function(css, opts) {
  return postcss([
      unprefix,
      removePrefixes,
      //shorthandExpand,
      compactor(compactorOpts),
      autoprefixer({browsers: "last 2 versions"})
  ]).process(css).then(function(result) {
    fs.writeFileSync("min.css", result.css);
    return result;
  });
}).then(function(result) {
  console.log(result);
});
