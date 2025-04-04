import loadUserSchemaConfig from "./loadConfig";
import { APIErrorResponse } from "./errors";

const schemaCache: { [key: string]: any } = {};
const validationCache = new Map<string, any>();
const VALIDATION_CACHE_TTL = 300000; // 5 minutes

interface FieldConfig {
    validation?: string;
    hash?: boolean;
    unique?: boolean;
    indexed?: boolean;
}

/**
 * Validate an item against the schema.
 * @param schemaName - The name of the schema (e.g., "user" or "post").
 * @param item - The item to validate.
 * @param currentId - The current ID of the item (for update operations).
 * @returns { status: number, message: string } | null - Returns an error object if validation fails, otherwise null.
 */
export async function validateData(
    schemaName: string, 
    item: any, 
    currentId?: number
): Promise<{ status: number; message: string } | null> {
    const cacheKey = `${schemaName}:${JSON.stringify(item)}:${currentId || ''}`;
    
    if (validationCache.has(cacheKey)) {
        return validationCache.get(cacheKey);
    }

    let schema = schemaCache[schemaName];
    
    if (!schema) {
        const config = await loadUserSchemaConfig();
        schema = config.schemas[schemaName];
        schemaCache[schemaName] = schema;
    }

    if (!schema?.fields) {
        throw new APIErrorResponse({
            message: `Schema "${schemaName}" not found.`,
            status: 404,
            code: "SCHEMA_NOT_FOUND"
        });
    }

    const processedItem = { ...item };

    for (const [fieldName, fieldConfig] of Object.entries(schema.fields) as [string, FieldConfig][]) {
        const value = processedItem[fieldName];
        const { validation, hash } = fieldConfig;

        if (hash && value) {
            processedItem[fieldName] = await Bun.password.hash(value, {
                algorithm: "bcrypt",
                cost: process.env.COST ? parseInt(process.env.COST) : 4,
            });
        }

        if (validation) {
            const rules = validation.split("|");
            for (const rule of rules) {
                if (rule === "required" && (!value || value.trim() === "")) {
                    return { 
                        status: 422,
                        message: `Field "${fieldName}" is required.` 
                    };
                }
            }
        }
    }

    Object.assign(item, processedItem);

    const result = null;
    validationCache.set(cacheKey, result);
    setTimeout(() => validationCache.delete(cacheKey), VALIDATION_CACHE_TTL);
    
    return result;
}