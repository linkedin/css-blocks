This is the language server for css-blocks that can plug into any client, such
as, vs code.

Contributing
1. `yarn run compile` in the root folder of `css-blocks`. This will compile all
   the code, including this package.
2. Open css-blocks from the workspace. Locate `css-blocks.code-workspace` file
   within `css-blocks` project. It should bring a pop up at the bottom that says
   something like “use workspace”. Click on it. If it does not, try the
   following  steps:
  1. from command palette, choose “Close workspace” - that should close
     everything and take you to the vscode start screen
  2. choose “Open folder”
  3. navigate to css-blocks and choose to open the css-blocks.code-workspace
     file directly
3. Open the debug panel by pressing `cmd+shift+D`
4. At the top there should be a drop down. select Client + Server
5. After that, pressing f5 or clicking the “play” icon next to the selected
   configuration should run the extension
6. If youre making changes to the server and you need to compile them as the
   changes are made, go to `css-blocks/packages/@css-blocks/language-server` and
   run `yarn watch`

