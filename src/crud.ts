import { getStorage } from "./storage";
import { SchemaField } from "./types";
import { validateData } from "./validation";
import { createJWT } from "./JWT";

export class CRUDHandler {
    private storage: any;
    private schemaName: string;
    private schema: SchemaField;

    constructor(storageType: "json" | "database", schemaName: string, schema: SchemaField) {
        this.storage = getStorage(storageType, schemaName);
        this.schemaName = schemaName;
        this.schema = schema;
    }

    async create(item: any) {
        const validationError = await validateData(this.schemaName, item);
        
        if (validationError) {
            console.log(validationError);

            return new Response(JSON.stringify({ message: validationError.message }), {
                status: validationError.status,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = this.storage.readData();
        const id = Object.keys(data).length + 1;

        if(this.schema.auth)
        {
            item['access_token'] = createJWT({
                sub: id,
                name: item['name'],
                iat: Math.floor(Date.now() / 1000), 
            } , process.env.JWT_SECRET);
        }

        data[id] = item;

        this.storage.writeData(data);
        return new Response(JSON.stringify({ id, ...item }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    }

    view(id: number) {
        const data = this.storage.readData();
        if(data[id])
        {
            return new Response(JSON.stringify({ data: data[id] }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ message: "not found - 404" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
        });
    }

    update(id: number, item: any) {
        const data = this.storage.readData();
        if (!data[id]) throw new Error("404 - Item not found");
        data[id] = { ...data[id], ...item };
        this.storage.writeData(data);
        return data[id];
    }

    delete(id: number) {
        const data = this.storage.readData();
        if (!data[id]) throw new Error("404 - Item not found");
        delete data[id];
        this.storage.writeData(data);
        return true;
    }
}