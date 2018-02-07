export const longHandMap = new Map<string, Set<string>>();
// this data orginally from https://github.com/gilmoreorless/css-shorthand-properties/blob/master/index.js
// which was unmaintained and incomplete.

// CSS 2.1: http://www.w3.org/TR/CSS2/propidx.html
longHandMap.set('list-style', new Set(['list-style-type', 'list-style-position', 'list-style-image']));
longHandMap.set('margin', new Set(['margin-top', 'margin-right', 'margin-bottom', 'margin-left']));
longHandMap.set('outline', new Set(['outline-width', 'outline-style', 'outline-color']));
longHandMap.set('padding', new Set(['padding-top', 'padding-right', 'padding-bottom', 'padding-left']));

// CSS Backgrounds and Borders Module Level 3: http://www.w3.org/TR/css3-background/
longHandMap.set('background', new Set(['background-image', 'background-position', 'background-size', 'background-repeat', 'background-origin', 'background-clip', 'background-attachment', 'background-color']));
longHandMap.set('border', new Set(['border-width', 'border-style', 'border-color']));
longHandMap.set('border-color', new Set(['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color']));
longHandMap.set('border-style', new Set(['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style']));
longHandMap.set('border-width', new Set(['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width']));
longHandMap.set('border-top', new Set(['border-top-width', 'border-top-style', 'border-top-color']));
longHandMap.set('border-right', new Set(['border-right-width', 'border-right-style', 'border-right-color']));
longHandMap.set('border-bottom', new Set(['border-bottom-width', 'border-bottom-style', 'border-bottom-color']));
longHandMap.set('border-left', new Set(['border-left-width', 'border-left-style', 'border-left-color']));
longHandMap.set('border-radius', new Set(['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius']));
longHandMap.set('border-image', new Set(['border-image-source', 'border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat']));

// CSS Fonts Module Level 3: http://www.w3.org/TR/css3-fonts/
longHandMap.set('font', new Set(['font-style', 'font-variant', 'font-weight', 'font-stretch', 'font-size', 'line-height', 'font-family']));
longHandMap.set('font-variant', new Set(['font-variant-ligatures', 'font-variant-alternates', 'font-variant-caps', 'font-variant-numeric', 'font-variant-east-asian']));

// CSS Masking Module Level 1: http://www.w3.org/TR/css-masking/
longHandMap.set('mask', new Set(['mask-image', 'mask-mode', 'mask-position', 'mask-size', 'mask-repeat', 'mask-origin', 'mask-clip']));
longHandMap.set('mask-border', new Set(['mask-border-source', 'mask-border-slice', 'mask-border-width', 'mask-border-outset', 'mask-border-repeat', 'mask-border-mode']));

// CSS Multi-column Layout Module: http://www.w3.org/TR/css3-multicol/
longHandMap.set('columns', new Set(['column-width', 'column-count']));
longHandMap.set('column-rule', new Set(['column-rule-width', 'column-rule-style', 'column-rule-color']));

// CSS Speech Module: http://www.w3.org/TR/css3-speech/
longHandMap.set('cue', new Set(['cue-before', 'cue-after']));
longHandMap.set('pause', new Set(['pause-before', 'pause-after']));
longHandMap.set('rest', new Set(['rest-before', 'rest-after']));

// CSS Text Decoration Module Level 3: http://www.w3.org/TR/css-text-decor-3/
longHandMap.set('text-decoration', new Set(['text-decoration-line', 'text-decoration-style', 'text-decoration-color']));
longHandMap.set('text-emphasis', new Set(['text-emphasis-style', 'text-emphasis-color']));

// CSS Animations (WD): http://www.w3.org/TR/css3-animations
longHandMap.set('animation', new Set(['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state']));

// CSS Transitions (WD): http://www.w3.org/TR/css3-transitions/
longHandMap.set('transition', new Set(['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay']));

// CSS Flexible Box Layout Module Level 1 (WD): http://www.w3.org/TR/css3-flexbox/
longHandMap.set('flex', new Set(['flex-grow', 'flex-shrink', 'flex-basis']));

let doubleExpandProps = new Set<string>(["border"]);

export function isShorthand(prop: string) {
  return longHandMap.has(prop);
}

export function isLonghand(prop: string) {
  return shortHandMap.has(prop);
}

export function computeShorthands(): Map<string, Set<string>> {
  let shorthandMap = new Map<string, Set<string>>();
  longHandMap.forEach((longhands, shorthand) => {
    longhands.forEach((longhand) => {
      let shorthands: string[] = [shorthand];
      longHandMap.forEach((morelonghands, anothershorthand) => {
        if (morelonghands.has(longhand)) {
          shorthands.push(anothershorthand);
        }
      });
      shorthandMap.set(longhand, new Set(shorthands));
    });
  });
  return shorthandMap;
}

const shortHandMap = computeShorthands();

export function shorthandsFor(prop: string): string[] {
  let result: Set<string> | string[] = shortHandMap.get(prop) || [];
  if (result instanceof Set) {
    return new Array(...result);
  } else {
    return result;
  }
}

export function longhandsFor(prop: string): string[] {
  let result: Set<string> | string[] = longHandMap.has(prop) && longHandMap.get(prop) || [];
  if (result instanceof Set) {
    return new Array(...result);
  } else {
    return result;
  }
}

export function allLonghandsFor(prop: string): string[] {
  if (doubleExpandProps.has(prop)) {
    return longhandsFor(prop).reduce<string[]>((memo, prop) => {
      memo.push(prop);
      return memo.concat(longhandsFor(prop));
    },                                         []);
  } else {
    return longhandsFor(prop);
  }
}