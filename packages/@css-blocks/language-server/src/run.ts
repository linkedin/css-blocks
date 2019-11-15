import { ProposedFeatures, TextDocuments, createConnection } from "vscode-languageserver";

import { Server } from "./Server";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments();

let server = new Server(connection, documents);

server.listen();
