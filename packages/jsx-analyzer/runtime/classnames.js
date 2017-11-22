"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var e = function (m) { throw new Error(m); };
var number = function (v) { return typeof v[0] === 'number' ? v.shift() : e('not a number: ' + (v[0] || 'undefined')); };
var string = function (v) { return v.shift().toString(); };
var truthyString = function (v) {
    var s = v.shift();
    if (!s && s !== 0)
        return;
    return s.toString();
};
var bool = function (v) { return !!v.shift(); };
function c(staticClasses, stack) {
    if (Array.isArray(staticClasses)) {
        stack = staticClasses;
        staticClasses = '';
    }
    if (!stack) {
        return staticClasses;
    }
    var sources = [];
    var classes = [];
    var nSources = number(stack);
    var nOutputs = number(stack);
    var canSetSource = true;
    var abort = function () { return canSetSource = false; };
    var isSourceSet = function (n) { return sources[n]; };
    var setSource = function (n) { if (canSetSource)
        sources[n] = true; };
    if (staticClasses.length > 0) {
        classes.push(staticClasses);
    }
    while (nSources-- > 0) {
        sourceExpr(stack, isSourceSet, setSource, abort);
        canSetSource = true;
    }
    while (nOutputs-- > 0) {
        var c_1 = string(stack);
        if (boolExpr(stack, isSourceSet))
            classes.push(c_1);
    }
    return classes.join(' ');
}
exports.default = c;
function sourceExpr(stack, isSourceSet, setSource, abort) {
    var type = number(stack);
    if (type & 1) {
        var numDeps = number(stack);
        while (numDeps-- > 0) {
            var depIndex = number(stack);
            if (!isSourceSet(depIndex))
                abort();
        }
    }
    if (type & 2) {
        if (!bool(stack))
            abort();
    }
    if (type & 4) {
        var nValues = number(stack);
        var ifFalsy = number(stack);
        var value = truthyString(stack);
        if (value === undefined) {
            switch (ifFalsy) {
                case 2:
                    value = string(stack);
                    break;
                case 0:
                    e('string expected');
                    break;
                case 1:
                    abort();
                    break;
                default:
                    e('wtf');
            }
        }
        while (nValues-- > 0) {
            var matchValue = string(stack);
            var nSources = number(stack);
            while (nSources-- > 0) {
                value === matchValue ? setSource(number(stack)) : number(stack);
            }
        }
    }
    else if (type === 0) {
        var condition = bool(stack);
        var nTrue = number(stack);
        while (nTrue-- > 0) {
            condition ? setSource(number(stack)) : number(stack);
        }
        var nFalse = number(stack);
        while (nFalse-- > 0) {
            condition ? number(stack) : setSource(number(stack));
        }
    }
    else {
        var nSources = number(stack);
        while (nSources-- > 0) {
            setSource(number(stack));
        }
    }
}
function boolExpr(stack, isSourceSet) {
    var result;
    var type = number(stack);
    switch (type) {
        case -1:
            return !boolExpr(stack, isSourceSet);
        case -3:
            var nAnds = number(stack);
            result = true;
            while (nAnds-- > 0) {
                var nextResult = boolExpr(stack, isSourceSet);
                result = result && nextResult;
            }
            return result;
        case -2:
            var nOrs = number(stack);
            result = false;
            while (nOrs-- > 0) {
                var nextResult = boolExpr(stack, isSourceSet);
                result = result || nextResult;
            }
            return result;
        default:
            return isSourceSet(type);
    }
}
