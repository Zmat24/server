import fs from "fs";
import path from "path";

class JSONStorage {
    private filePath: string;

    constructor(fileName: string) {
        const dbDir = path.resolve(process.cwd(), "db");
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.filePath = path.resolve(dbDir, `${fileName}.json`);
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}, null, 2));
        }
    }

    readData() {
        return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
    }

    writeData(data: any) {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }
}

export function getStorage(type: "json" | "database", schemaName: string) {
    if (type === "json") return new JSONStorage(schemaName);
    throw new Error("Invalid storage type");
}