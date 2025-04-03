import { getStorage } from "./storage";
import { SchemaField } from "./types";
import { validateData } from "./validation";
import { createJWT } from "./JWT";
import loadUserSchemaConfig from "./loadConfig";
import { APIErrorResponse } from "./errors";
const config = await loadUserSchemaConfig();

export class CRUDHandler {
    private storage: any;
    private schemaName: string;
    private schema: SchemaField;
    private validationCache: Map<string, any> = new Map();
    private responseCache: Map<string, Response> = new Map();
    private CACHE_TTL = 60000; // 1 minute cache
    
    /**
     * Creates a new CRUD handler for the specified schema
     * @param storageType Type of storage to use
     * @param schemaName Name of the schema
     * @param schema Optional schema definition (will use config if not provided)
     */
    constructor(storageType: "json" | "database", schemaName: string, schema?: SchemaField) {
        this.storage = getStorage(storageType, schemaName , schema);
        this.schemaName = schemaName;
        this.schema = schema || config.schemas[schemaName];
        
        // Initialize indexes once at startup
        if (this.schema.fields) {
            Object.entries(this.schema.fields).forEach(([fieldName, field]) => {
                if (field.unique || field.indexed) {
                    // this.storage.createIndex(fieldName);
                }
            });
        }
    }

    /**
     * Creates a new item in storage
     * @param item Item data to create
     * @returns Response with created item
     */
    async create(item: Record<string, unknown>) {
        // Fast validation with caching
        const itemHash = JSON.stringify(item);
        let validationError = this.validationCache.get(itemHash);
        
        if (validationError === undefined) {
            validationError = await validateData(this.schemaName, item);
            this.validationCache.set(itemHash, validationError);
        }
        
        if (validationError) {
            throw new APIErrorResponse({
                message: validationError.message,
                status: validationError.status,
                code: "VALIDATION_ERROR",
                details: validationError
            });
        }

        // Generate JWT token if needed
        if (this.schema.auth) {
            const id = await this.storage.writeData(item);
            item['access_token'] = createJWT({
                sub: id,
                name: item['name'],
                iat: Math.floor(Date.now() / 1000) + (this.schema.auth.expiresIn ?? 60 * 60 * 24), 
            }, process.env.JWT_SECRET);
            
            return new Response(JSON.stringify({ id, ...item }), {
                status: 201,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Direct write without JWT
        const id = await this.storage.writeData(item);
        return new Response(JSON.stringify({ id, ...item }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Retrieves an item by ID
     * @param id Item ID
     * @returns Response with item data
     */
    async view(id: number) {
        const cacheKey = `view:${id}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached) return cached;

        const data = await this.storage.readData();
        const item = data[id]?.data;
        
        if (!item) {
            throw new APIErrorResponse({
                message: "Item not found",
                status: 404,
                code: "ITEM_NOT_FOUND"
            });
        }

        const response = new Response(JSON.stringify({ data: item }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

        this.responseCache.set(cacheKey, response);
        setTimeout(() => this.responseCache.delete(cacheKey), this.CACHE_TTL);

        return response;
    }

    async findByField(fieldName: string, value: any) {
        const cacheKey = `find:${fieldName}:${value}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached) return cached;

        const results = this.storage.findByIndex(fieldName, value);
        const response = new Response(JSON.stringify({ data: results }), {
            status: results.length ? 200 : 404,
            headers: { "Content-Type": "application/json" },
        });

        this.responseCache.set(cacheKey, response);
        setTimeout(() => this.responseCache.delete(cacheKey), this.CACHE_TTL);

        return response;
    }

    /**
     * Updates an existing item
     * @param id Item ID
     * @param item Updated item data
     * @returns Updated item
     */
    async update(id: number, item: Record<string, unknown>) {
        const data = await this.storage.readData();
        const existingItem = data[id];

        if (!existingItem) {
            throw new APIErrorResponse({
                message: "Item not found",
                status: 404,
                code: "ITEM_NOT_FOUND"
            });
        }

        const updatedItem = { ...existingItem.data, ...item };
        const itemHash = JSON.stringify(updatedItem);
        let validationError = this.validationCache.get(itemHash);
        
        if (validationError === undefined) {
            validationError = await validateData(this.schemaName, updatedItem, id);
            this.validationCache.set(itemHash, validationError);
        }

        if (validationError) {
            throw new APIErrorResponse({
                message: validationError.message,
                status: validationError.status,
                code: "VALIDATION_ERROR",
                details: validationError
            });
        }

        await this.storage.writeData({ ...data, [id]: { data: updatedItem } });
        return new Response(JSON.stringify(updatedItem), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    /**
     * Deletes an item
     * @param id Item ID
     * @returns Response indicating success
     */
    async delete(id: number) {
        const data = await this.storage.readData();
        if (!data[id]) {
            throw new APIErrorResponse({
                message: "Item not found",
                status: 404,
                code: "ITEM_NOT_FOUND"
            });
        }

        delete data[id];
        await this.storage.writeData(data);
        
        return new Response(JSON.stringify({ message: "Item deleted successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
}