export interface SchemaField {
    endpoints?: {
        create: boolean | null;
        view: boolean | null;
        update: boolean | null;
        delete: boolean | null;
    };
    middleware?: string[] | null;
    auth?: {
        type: "jwt" | "login";
    };
    fields: {
        [key: string]: {
            validation?: string | null;
            hash?: boolean | null
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