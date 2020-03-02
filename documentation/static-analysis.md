# What is Static Analysis?

Static analysis is when code is analyized without actually running the software (in contrast to dynamic analysis, which is performed while the code is executing).

The key to this is that it is an automated process and requires certain things of the code. Namely, that the code be predictable and consistient, with little dynamic behavior. CSS and Javascript in modern web applications is usually neither of these: the two areas not understanding each other but changing how each may be applied. This has been a problem for implementing the benefits of static analysis in modern web developement. 

## How CSS Blocks uses Static Analysis

Because CSS Blocks understands your templates _and_ your CSS it brings the ability to look at your project and know with *certainty* that any given CSS declaration will, will not, or might (under certain conditions), be used on a given element in your templates.

Most stylesheet architectures have to walk a fine line between performance and
maintainability. Tilt too far in either direction and either your users or the developers will end up paying the cost. With CSS Blocks you can focus on making sure your stylesheets are easy to maintain as your application changes.

Additionally, with our new CSS optimizer, [OptiCSS](https://github.com/linkedin/opticss), the reduction in the size of your app's production stylesheets can be significant.

## The Bottom Line

Static analysis means that you no long have to do things like spending time debugging your app only to discover a subtle typo that caused a selector to not match. CSS Blocks will give you a build-time error and suggest possible fixes.

With CSS Blocks resolution system, cascade conflicts are caught for you before you even know they exist. You never have to fight a specificity war ever again!

Additionally, with IDE integration, projects using CSS Blocks are able to quickly navigate to between selector definitions and the template elements that match them, as well as helpful tools like autocompletion of class names whilst wring templates.

Long story short: CSS Blocks' static analysis of your styles brings predictability and simplicity to your applications styling.


