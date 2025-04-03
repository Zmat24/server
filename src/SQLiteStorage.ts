import { Database, SQLQueryBindings } from 'bun:sqlite';
import { SchemaField } from './types';

export class SQLiteStorage {
    private db: Database;
    private tableName: string;
    private schema: SchemaField;

    constructor(tableName: string, schema: SchemaField) {
        this.db = new Database('database.sqlite');
        this.tableName = tableName;
        this.schema = schema;
        this.initializeTable();
    }

    private initializeTable() {
        const fields = Object.entries(this.schema.fields).map(([fieldName, field]) => {
            let type = 'TEXT';
            if (field.validation?.includes('number')) {
                type = 'INTEGER';
            } else if (field.validation?.includes('boolean')) {
                type = 'BOOLEAN';
            }
            
            const constraints = [];
            if (field.unique) constraints.push('UNIQUE');
            
            return `${fieldName} ${type} ${constraints.join(' ')}`;
        }).join(', ');

        this.db.run(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ${fields},
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ایجاد ایندکس‌ها
        Object.entries(this.schema.fields).forEach(([fieldName, field]) => {
            if (field.indexed || field.unique) {
                this.db.run(`
                    CREATE INDEX IF NOT EXISTS idx_${this.tableName}_${fieldName}
                    ON ${this.tableName}(${fieldName})
                `);
            }
        });
    }

    async writeData(data: any): Promise<string> {
        const fields = Object.keys(data).filter(key => key in this.schema.fields);
        const values = fields.map(field => data[field]) as SQLQueryBindings[];
        const placeholders = fields.map(() => '?').join(', ');

        const query = `
            INSERT INTO ${this.tableName} (${fields.join(', ')})
            VALUES (${placeholders})
        `;

        const result = this.db.run(query, [...values]);
        return result.lastInsertRowid!.toString();
    }

    async readData(id?: number): Promise<any> {
        if (id) {
            return this.db.query(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
        }
        return this.db.query(`SELECT * FROM ${this.tableName}`).all();
    }

    async findByField(field: string, value: any): Promise<any[]> {
        return this.db.query(
            `SELECT * FROM ${this.tableName} WHERE ${field} = ?`
        ).all(value);
    }

    async update(id: number, data: any): Promise<void> {
        const fields = Object.keys(data)
            .filter(key => key in this.schema.fields)
            .map(field => `${field} = ?`);
        const values = [...Object.values(data), id] as SQLQueryBindings[];

        const query = `
            UPDATE ${this.tableName}
            SET ${fields.join(', ')}
            WHERE id = ?
        `;

        this.db.run(query, [...values]);
    }

    async delete(id: number): Promise<void> {
        this.db.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
    }
}