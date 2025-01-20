import { getStorage } from "./storage";
import { validateData } from "./validation";

export class CRUDHandler {
    private storage: any;
    private schemaName: string;

    constructor(storageType: "json" | "database", schemaName: string) {
        this.storage = getStorage(storageType, schemaName);
        this.schemaName = schemaName;
    }

    async create(item: any) {
        const validationError = await validateData(this.schemaName, item);
        
        if (validationError) {
            console.log(validationError);

            return new Response(JSON.stringify({ message: validationError.message }), {
                status: validationError.status,
                headers: { "Content-Type": "application/json" },
            });
        }else {
            const data = this.storage.readData();
            const id = Object.keys(data).length + 1;
            data[id] = item;
            this.storage.writeData(data);
            return new Response(JSON.stringify({ id, ...item }), {
                status: 201,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    read(id: number) {
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
        if (!data[id]) throw new Error("Item not found");
        data[id] = { ...data[id], ...item };
        this.storage.writeData(data);
        return data[id];
    }

    delete(id: number) {
        const data = this.storage.readData();
        if (!data[id]) throw new Error("Item not found");
        delete data[id];
        this.storage.writeData(data);
        return true;
    }
}