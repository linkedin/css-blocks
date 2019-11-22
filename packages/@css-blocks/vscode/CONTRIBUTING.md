# CSS Blocks Language Server

## **NOTE:** This is currently experimental and is missing core functionality.

## How to run and debug the client
- Open the project in vscode.
- Open the debug panel (cmd + shift + D)
- Make sure "Launch Client" is the selected debug profile
- Press f5 (Or click the arrow beside the selected profile).
- This will start a "host" vscode instance with the extension installed which can
be used to test out its features.
- At this point you may set breakpoints and debug any of the client code.

## How to run and debug the server
- The server will be started automatically by the client, so **you
must make sure to start the client debug profile first.**
- **While the client debug profile is running,** select the "Attach to Server" debug profile.
- Press f5 (Or click the arrow beside the selected profile).
- Now you can set breakpoints in the server and debug from within vscode.

For more detailed information about language server extensions: https://code.visualstudio.com/api/language-extensions/language-server-extension-guide