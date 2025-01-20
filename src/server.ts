import loadUserSchemaConfig from "./loadConfig";
import { CRUDHandler } from "./crud";

const handlers: { [key: string]: CRUDHandler } = {};
const config = await loadUserSchemaConfig();

for (const schemaName of Object.keys(config.schemas)) {
    handlers[schemaName] = new CRUDHandler(config.storage, schemaName, config.schemas[schemaName]);
}

const appPort = process.env.PORT ?? 3232;

console.log(
    "\x1b[32m\x1b[1m Expose Zmat24 JS Server on: \x1b[33m\x1b[1m" +
    "http://localhost:"+appPort +
    "\x1b[32m\x1b[1m \n\x1b[0m"
);

console.log("\x1b[34m\x1b[1m Handlers detected from schema config file \n\x1b[0m");
console.log(handlers);

export default {
    port: appPort,
    async fetch(req: Request) {
        const url = new URL(req.url);
        const pathParts = url.pathname.split("/").filter(Boolean);

        console.log(
            "\x1b[35m\x1b[1mNew Request: \x1b[36m" +
            pathParts.join("/") +
            "\x1b[90m (" + new Date().toISOString() + ")\x1b[0m"
        );

        if (pathParts.length < 2) {
            return new Response("Invalid path", { status: 400 });
        }

        const [schemaName, action, id] = pathParts;
        const handler = handlers[schemaName];

        if (!handler) {
            return new Response("Schema not found", { status: 404 });
        }
        
        try {
            switch (action) {
                case "create":
                    return handler.create(await req.json());
                case "view":
                    return handler.view(Number(id));
                case "update":
                    return new Response(
                        JSON.stringify(handler.update(Number(id), await req.json())),
                        { status: 200, headers: { "Content-Type": "application/json" } }
                    );
                case "delete":
                    return new Response(
                        JSON.stringify(handler.delete(Number(id))),
                        { status: 200, headers: { "Content-Type": "application/json" } }
                    );
                default:
                    return new Response("Invalid action", { status: 400 });
            }
        } catch (err: any) {
            return new Response(err.message, { status: 500 });
        }
    },
};