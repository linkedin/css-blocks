
const e = (m) => { throw new Error(m); };
const toStr = (s) => typeof s === "symbol" ? s.toString() : "" + s;
const num = (v) => typeof v[0] === "number" ? v.shift() : e("not a number: " + toStr(v[0]));
const str = (s) => toStr(s.shift());
const truthyString = (v) => {
    let s = v.shift();
    if (!s && s !== 0)
        return;
    return s.toString();
};
const bool = (v) => !!v.shift();
function classnames(stack) {
    stack = stack.slice(0);
    let sources = [];
    let classes = [];
    let nSources = num(stack);
    let nOutputs = num(stack);
    let canSetSource = true;
    let abort = () => canSetSource = false;
    let isSourceSet = (n) => sources[n];
    let setSource = (n) => { if (canSetSource)
        sources[n] = true; };
    while (nSources-- > 0) {
        sourceExpr(stack, isSourceSet, setSource, abort);
        canSetSource = true;
    }
    while (nOutputs-- > 0) {
        let c = str(stack);
        if (boolExpr(stack, isSourceSet))
            classes.push(c);
    }
    return classes.join(" ");
}

function sourceExpr(stack, isSourceSet, setSource, abort) {
    let enforceSwitch = true;
    let type = num(stack);
    if (type & 1 /* dependency */) {
        let numDeps = num(stack);
        while (numDeps-- > 0) {
            let depIndex = num(stack);
            if (!isSourceSet(depIndex))
                enforceSwitch = abort();
        }
    }
    if (type & 2 /* boolean */) {
        if (!bool(stack))
            abort();
    }
    if (type & 4 /* switch */) {
        let nValues = num(stack);
        let ifFalsy = num(stack);
        let value = truthyString(stack);
        if (value === undefined) {
            switch (ifFalsy) {
                case 2 /* default */:
                    value = str(stack);
                    break;
                case 0 /* error */:
                    if (enforceSwitch)
                        e("string expected"); // TODO: error message
                    break;
                case 1 /* unset */:
                    abort();
                    break;
                default:
                    e("wtf");
            }
        }
        while (nValues-- > 0) {
            let matchValue = str(stack);
            let nSources = num(stack);
            while (nSources-- > 0) {
                value === matchValue ? setSource(num(stack)) : num(stack);
            }
        }
    }
    else if (type === 0 /* ternary */) {
        let condition = bool(stack);
        let nTrue = num(stack);
        while (nTrue-- > 0) {
            condition ? setSource(num(stack)) : num(stack);
        }
        let nFalse = num(stack);
        while (nFalse-- > 0) {
            condition ? num(stack) : setSource(num(stack));
        }
    }
    else {
        let nSources = num(stack);
        while (nSources-- > 0) {
            setSource(num(stack));
        }
    }
}
function boolExpr(stack, isSourceSet) {
    let result;
    let type = num(stack);
    switch (type) {
        case -1 /* not */:
            return !boolExpr(stack, isSourceSet);
        case -3 /* and */:
            let nAnds = num(stack);
            result = true;
            while (nAnds-- > 0) {
                let nextResult = boolExpr(stack, isSourceSet);
                result = result && nextResult;
            }
            return result;
        case -2 /* or */:
            let nOrs = num(stack);
            result = false;
            while (nOrs-- > 0) {
                let nextResult = boolExpr(stack, isSourceSet);
                result = result || nextResult;
            }
            return result;
        default:
            return isSourceSet(type);
    }
}

export { classnames };