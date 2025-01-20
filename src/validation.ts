import loadUserSchemaConfig from "./loadConfig";

/**
 * Validate an item against the schema.
 * @param schemaName - The name of the schema (e.g., "user" or "post").
 * @param item - The item to validate.
 * @returns { status: number, message: string } | null - Returns an error object if validation fails, otherwise null.
 */
export async function validateData(schemaName: string, item: any): Promise<{ status: number; message: string } | null> {
    const config = await loadUserSchemaConfig();
    const schema = config.schemas[schemaName].fields;

    if (!schema) {
        return { status: 404, message: `Schema "${schemaName}" not found.` };
    }

    for (const fieldName of Object.keys(schema)) {
        if (item[fieldName] === undefined) {
            return { status: 422, message: `Field "${fieldName}" is required.` };
        }
    }

    for (const [fieldName, fieldConfig] of Object.entries(schema)) {
        const value = item[fieldName];
        const { validation } = fieldConfig;
    
        if (validation) {
            const rules = validation.split("|");
            for (const rule of rules) {
                if (rule.includes(":")) {
                    const [ruleName, ruleValue] = rule.split(":");
    
                    switch (ruleName) {
                        case "min":
                            const minLength = parseInt(ruleValue);
                            if (value.length < minLength) {
                                return { status: 422, message: `Field "${fieldName}" must be at least ${minLength} characters long.` };
                            }
                            break;
    
                        case "max":
                            const maxLength = parseInt(ruleValue);
                            if (value.length > maxLength) {
                                return { status: 422, message: `Field "${fieldName}" must be at most ${maxLength} characters long.` };
                            }
                            break;
    
                        default:
                            break;
                    }
                } else {
                    switch (rule) {
                        case "required":
                            if (!value || value.trim() === "") {
                                return { status: 422, message: `Field "${fieldName}" is required.` };
                            }
                            break;
    
                        default:
                            break;
                    }
                }
            }
        }
    }

    return null;
}