export interface SchemaField {
    endpoints?: {
        create: boolean | null;
        view: boolean | null;
        update: boolean | null;
        delete: boolean | null;
        find: boolean | null;
    };
    middleware?: string[] | null;
    auth?: {
        type: "jwt" | "login";
        expiresIn?: number;
    };
    fields: {
        [key: string]: {
            validation?: string | null;
            hash?: boolean | null,
            unique?: boolean | null,
            indexed?: boolean | null
        };
    };
}

export interface Schema {
    [key: string]: SchemaField;
}

export interface Config {
    storage: "json" | "database";
    schemas: Schema;
}