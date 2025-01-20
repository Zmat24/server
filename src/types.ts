export interface SchemaField {
    [key: string]: {
        type: string,
        validation ?: string|null,
        endpoints: {
            create: boolean,
            read: boolean,
            update: boolean,
            delete: boolean,
        }
    };
}

export interface Schema {
    [key: string]: SchemaField;
}

export interface Config {
    storage: "json" | "database";
    schemas: Schema;
}