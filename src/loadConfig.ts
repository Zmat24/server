import path from 'path';
import fs from 'fs';
import { Config } from './types';

export default async function loadUserSchemaConfig(): Promise<Config> {
    const configPath = path.join(process.cwd(), 'schema.config.js');
    if (!fs.existsSync(configPath)) {
        throw new Error('schema.config.js not found in the root directory.');
    }

    const userConfig = await import(configPath);
    return userConfig.default; 
}
