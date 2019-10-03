import { Syntax } from "@css-blocks/core/dist/src";
import { ProposedFeatures, TextDocuments, createConnection } from "vscode-languageserver";

import { EmberClassicTransformer } from "./pathTransformers/EmberClassicTransformer";
import { Server } from "./Server";

// TODO: We will eventually need to support different path transformations
// and block syntax depending on configuration. For now we are just assuming
// an ember classic project and css syntax.
const pathTransformer = new EmberClassicTransformer(Syntax.css);
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments();

let server = new Server(connection, documents, pathTransformer);

server.listen();
