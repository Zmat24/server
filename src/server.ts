import loadUserSchemaConfig from "./loadConfig";
import { CRUDHandler } from "./crud";
import { middlewares, MiddlewareContext } from "./middleware";
import { APIErrorResponse, createErrorResponse } from "./errors";
import { generateDocs } from "./docs";

const handlers: { [key: string]: CRUDHandler } = {};
const config = await loadUserSchemaConfig();

for (const schemaName of Object.keys(config.schemas)) {
    const schema = config.schemas[schemaName];
    if (!schema.middleware) {
        schema.middleware = [];
    }
    if (!schema.middleware.includes('logger')) {
        schema.middleware.push('logger');
    }
    handlers[schemaName] = new CRUDHandler(config.storage, schemaName, schema);
}

const server = Bun.serve({
    port: process.env.PORT ?? 3065,
    async fetch(req: Request) {
        const url = new URL(req.url);
        const pathParts = url.pathname.split("/").filter(Boolean);

        if (pathParts[0] === "docs") {
            const docs = generateDocs(config.schemas);
            return new Response(docs, {
                headers: { "Content-Type": "text/html" },
            });
        }

        try {
            if (pathParts.length < 2) {
                throw new APIErrorResponse({
                    message: "Invalid path",
                    status: 400,
                    code: "INVALID_PATH"
                });
            }

            const [schemaName, action, id] = pathParts;
            const handler = handlers[schemaName];

            if (!handler) {
                throw new APIErrorResponse({
                    message: "Schema not found",
                    status: 404,
                    code: "SCHEMA_NOT_FOUND"
                });
            }

            const middlewareContext: MiddlewareContext = {
                req,
                schema: config.schemas,
                schemaName,
                action
            };

            const middlewareResponse = await runMiddlewares(middlewareContext);
            if (middlewareResponse) {
                return middlewareResponse;
            }

            switch (action) {
                case "create":
                    if(config.schemas[schemaName].endpoints?.create) {
                        return await handler.create(await req.json());
                    }
                    throw new APIErrorResponse({
                        message: "Create endpoint is not allowed",
                        status: 403,
                        code: "ENDPOINT_FORBIDDEN"
                    });

                case "view":
                    if(config.schemas[schemaName].endpoints?.view) {
                        if (!id) {
                            throw new APIErrorResponse({
                                message: "ID is required",
                                status: 400,
                                code: "MISSING_ID"
                            });
                        }
                        return await handler.view(Number(id));
                    }
                    throw new APIErrorResponse({
                        message: "View endpoint is not allowed",
                        status: 403,
                        code: "ENDPOINT_FORBIDDEN"
                    });

                case "update":
                    if(config.schemas[schemaName].endpoints?.update) {
                        if (!id) {
                            throw new APIErrorResponse({
                                message: "ID is required",
                                status: 400,
                                code: "MISSING_ID"
                            });
                        }
                        return await handler.update(Number(id), await req.json());
                    }
                    throw new APIErrorResponse({
                        message: "Update endpoint is not allowed",
                        status: 403,
                        code: "ENDPOINT_FORBIDDEN"
                    });

                case "delete":
                    if(config.schemas[schemaName].endpoints?.delete) {
                        if (!id) {
                            throw new APIErrorResponse({
                                message: "ID is required",
                                status: 400,
                                code: "MISSING_ID"
                            });
                        }
                        return await handler.delete(Number(id));
                    }
                    throw new APIErrorResponse({
                        message: "Delete endpoint is not allowed",
                        status: 403,
                        code: "ENDPOINT_FORBIDDEN"
                    });

                case "find":
                    if(config.schemas[schemaName].endpoints?.find) {
                        const params = new URLSearchParams(url.search);
                        const field = params.get('field');
                        const value = params.get('value');
                        
                        if (!field || !value) {
                            throw new APIErrorResponse({
                                message: "Both 'field' and 'value' parameters are required",
                                status: 400,
                                code: "MISSING_PARAMETERS",
                                details: { field, value }
                            });
                        }
                        
                        return await handler.findByField(field, value);
                    }
                    throw new APIErrorResponse({
                        message: "Find endpoint is not allowed",
                        status: 403,
                        code: "ENDPOINT_FORBIDDEN"
                    });

                default:
                    throw new APIErrorResponse({
                        message: "Invalid action",
                        status: 400,
                        code: "INVALID_ACTION"
                    });
            }
        } catch (error) {
            return createErrorResponse(error);
        }
    },
});

console.log(
    "\x1b[32m\x1b[1m Expose Zmat24 JS Server on: \x1b[33m\x1b[1m" +
    "http://localhost:"+server.port +
    "\x1b[32m\x1b[1m \n\x1b[0m"
);

console.log("\x1b[34m\x1b[1m Handlers detected from schema config file \n\x1b[0m");
// console.log(handlers);

async function runMiddlewares(context: MiddlewareContext): Promise<Response | null> {
    const schema = config.schemas[context.schemaName];
    
    if (!schema.middleware || !Array.isArray(schema.middleware)) {
        return null;
    }

    for (const middlewareName of schema.middleware) {
        const middleware = middlewares[middlewareName];
        if (!middleware) {
            console.warn(`Middleware "${middlewareName}" not found`);
            continue;
        }

        const response = await middleware(context);
        if (response) {
            return response;
        }
    }

    return null;
}