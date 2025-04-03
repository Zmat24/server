import fs from "fs";
import path from "path";
import { SchemaField } from "./types";

interface StorageItem {
    data: any;
    indexes: { [key: string]: any };
}

interface StorageIndexes {
    [key: string]: Array<{value: any, key: string}>;
}

interface StorageData {
    [key: string]: StorageItem | StorageIndexes | number;
    sortedIndexes: StorageIndexes;
    last_id: number;
}

class JSONStorage {
    private filePath: string;
    private cache: StorageData | null = null;
    private indexes: Map<string, Map<any, Set<string>>> = new Map();
    private isDirty: boolean = false;
    private saveInterval: ReturnType<typeof setInterval> | null = null;
    private SAVE_INTERVAL = 10000; // 10 seconds
    private lastId: number = 0;
    private writeQueue: Set<string> = new Set();
    private processingQueue = false;

    constructor(fileName: string) {
        const dbDir = path.resolve(process.cwd(), "db");
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.filePath = path.resolve(dbDir, `${fileName}.json`);
        if (!fs.existsSync(this.filePath)) {
            const initialData: StorageData = {
                sortedIndexes: {}
            } as StorageData;
            fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
        }

        // Start periodic save
        this.saveInterval = setInterval(() => {
            this.forceSave();
        }, this.SAVE_INTERVAL);

        // Clean up on process exit
        process.on('beforeExit', () => {
            if (this.saveInterval) {
                clearInterval(this.saveInterval);
            }
            this.forceSave();
        });
    }

    private ensureCache() {
        if (!this.cache) {
            const fileContent = fs.readFileSync(this.filePath, "utf-8");
            this.cache = JSON.parse(fileContent);
            
            if (!this.cache.sortedIndexes) {
                this.cache.sortedIndexes = {};
            }
            this.lastId = this.cache.last_id || 0;
        }
        return this.cache;
    }

    private binarySearch<T>(arr: T[], target: T, key?: string): number {
        let left = 0;
        let right = arr.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const value = key ? (arr[mid] as any)[key] : arr[mid];

            if (value === target) return mid;
            if (value < target) left = mid + 1;
            else right = mid - 1;
        }

        return -1;
    }

    private createSortedIndex(entries: [string, any][], field: string) {
        const existingIndex = this.cache?.sortedIndexes[field] || [];
        const newEntries = entries
            .filter(([_, value]) => 
                value.data && 
                value.data[field] !== undefined && 
                !existingIndex.some(idx => idx.key === value.key)
            )
            .map(([key, value]) => ({
                value: value.data[field],
                key
            }));

        return [...existingIndex, ...newEntries].sort((a, b) => {
            if (a.value < b.value) return -1;
            if (a.value > b.value) return 1;
            return 0;
        });
    }

    private updateEntryIndexes(entries: [string, any][], field: string) {
        entries.forEach(([_, value]) => {
            if (typeof value === 'object' && 'data' in value) {
                if (!value.indexes) {
                    value.indexes = {};
                }
                if (value.data && value.data[field] !== undefined) {
                    value.indexes[field] = value.data[field];
                }
            }
        });
    }

    createIndex(field: string) {
        const data = this.ensureCache();
        if (!this.indexes.has(field)) {
            this.updateIndex(field);
        }
    }

    private isStorageItem(value: any): value is StorageItem {
        return typeof value === 'object' && value !== null && 'data' in value && 'indexes' in value;
    }

    findByIndex(field: string, value: any): any[] {
        const data = this.ensureCache();
        
        if (!this.indexes.has(field)) {
            this.updateIndex(field);
        }

        const indexMap = this.indexes.get(field);
        if (!indexMap) return [];

        const matches = indexMap.get(value);
        if (!matches) return [];

        return Array.from(matches)
            .map(key => data[key])
            .filter(this.isStorageItem)
            .map(item => item.data);
    }

    async readData(): Promise<any> {
        return this.ensureCache();
    }

    async writeData(data: any): Promise<string> {
        if (!this.cache) {
            this.ensureCache();
        }

        this.lastId++;
        const id = this.lastId.toString();

        if (this.cache) {
            this.cache[id] = {
                data: data.data || data,
                indexes: {}
            };
            this.cache.last_id = this.lastId;
        }

        this.isDirty = true;

        if (this.indexes.size > 0) {
            for (const field of this.indexes.keys()) {
                this.writeQueue.add(field);
            }
            
            if (!this.processingQueue) {
                setTimeout(() => this.processWriteQueue(), 0);
            }
        }

        return id;
    }

    private async processWriteQueue() {
        if (this.processingQueue || this.writeQueue.size === 0) return;
        
        this.processingQueue = true;
        const fields = Array.from(this.writeQueue);
        this.writeQueue.clear();

        for (const field of fields) {
            await this.updateIndex(field);
        }
        
        this.processingQueue = false;
    }

    private async updateIndex(field: string) {
        if (!this.cache) return;
        
        const indexMap = new Map<any, Set<string>>();
        
        Object.entries(this.cache)
            .filter(([key]) => key !== 'sortedIndexes' && key !== 'last_id')
            .forEach(([key, value]) => {
                if (this.isStorageItem(value) && value.data[field] !== undefined) {
                    const fieldValue = value.data[field];
                    if (!indexMap.has(fieldValue)) {
                        indexMap.set(fieldValue, new Set());
                    }
                    indexMap.get(fieldValue)!.add(key);
                }
            });
        
        this.indexes.set(field, indexMap);
    }

    private safeStringify(obj: any): string {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        });
    }

    private forceSave() {
        if (this.isDirty && this.cache) {
            try {
                const stream = fs.createWriteStream(this.filePath);
                stream.write(`{\n"last_id":${this.lastId}`);
                
                const entries = Object.entries(this.cache)
                    .filter(([key]) => key !== 'sortedIndexes' && key !== 'last_id');
                
                const CHUNK_SIZE = 100;
                let currentChunk = 0;
                
                const writeChunk = () => {
                    const chunk = entries.slice(
                        currentChunk * CHUNK_SIZE, 
                        (currentChunk + 1) * CHUNK_SIZE
                    );
                    
                    if (chunk.length === 0) {
                        stream.write('\n}');
                        stream.end();
                        return;
                    }
                    
                    chunk.forEach(([key, value], index) => {
                        const isFirstItem = currentChunk === 0 && index === 0;
                        stream.write(
                            `${isFirstItem ? '\n,' : ','}\n"${key}":${this.safeStringify(value)}`
                        );
                    });
                    
                    currentChunk++;
                    setImmediate(writeChunk);
                };
                
                writeChunk();
                this.isDirty = false;
                
                return new Promise((resolve, reject) => {
                    stream.on('finish', resolve);
                    stream.on('error', reject);
                });
                
            } catch (error) {
                console.error('Error saving data:', error);
            }
        }
    }
}

export function getStorage(type: "json" | "database", schemaName: string , schema?: SchemaField) {
    if (type === "json") return new JSONStorage(schemaName);
    throw new Error("Invalid storage type");
}

interface CustomStorage {
    create(collection: string, data: any): Promise<any>;
    findById(collection: string, id: number): Promise<any>;
    findByField(collection: string, field: string, value: any): Promise<any[]>;
}

export class FileStorage implements CustomStorage {
    private cache: { [key: string]: any[] } = {};
    private writeTimeout: { [key: string]: any } = {};

    constructor(private baseDir: string = './db') {
        const files = fs.readdirSync(baseDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const collection = file.replace('.json', '');
                this.cache[collection] = this.readFile(collection);
            }
        });
    }

    private readFile(collection: string): any[] {
        const filePath = `${this.baseDir}/${collection}.json`;
        if (!fs.existsSync(filePath)) return [];
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content || '[]');
    }

    private scheduleWrite(collection: string) {
        if (this.writeTimeout[collection]) {
            clearTimeout(this.writeTimeout[collection]);
        }

        const filePath = `${this.baseDir}/${collection}.json`;
        fs.writeFileSync(filePath, JSON.stringify(this.cache[collection], null, 2));
        delete this.writeTimeout[collection];
    }

    async create(collection: string, data: any): Promise<any> {
        if (!this.cache[collection]) {
            this.cache[collection] = this.readFile(collection);
        }

        const id = (this.cache[collection].length > 0 
            ? Math.max(...this.cache[collection].map(item => item.id)) + 1 
            : 1);
        
        const record = { ...data, id };
        this.cache[collection].push(record);
        this.scheduleWrite(collection);
        
        return record;
    }

    async findById(collection: string, id: number): Promise<any> {
        if (!this.cache[collection]) {
            this.cache[collection] = this.readFile(collection);
        }
        return this.cache[collection].find(item => item.id === id);
    }

    async findByField(collection: string, field: string, value: any): Promise<any[]> {
        if (!this.cache[collection]) {
            this.cache[collection] = this.readFile(collection);
        }
        return this.cache[collection].filter(item => item[field] === value);
    }
}