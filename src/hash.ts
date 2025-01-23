export class Hasher {
    private static readonly ITERATIONS = process.env.ITERATIONS ? parseInt(process.env.ITERATIONS) : 10;
    
    private static stringToBuffer(str: string): Uint8Array {
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i);
        }
        return arr;
    }

    private static bufferToHex(buffer: Uint8Array): string {
        return Array.from(buffer)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    private static xorBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
        const length = Math.max(a.length, b.length);
        const result = new Uint8Array(length);
        
        for (let i = 0; i < length; i++) {
            result[i] = (a[i] || 0) ^ (b[i] || 0);
        }
        
        return result;
    }

    private static async sha256(message: string): Promise<Uint8Array> {
        const msgBuffer = this.stringToBuffer(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        return new Uint8Array(hashBuffer);
    }

    static async hash(value: string): Promise<string> {
        let hashedValue = await this.sha256(value);
        
        for (let i = 0; i < this.ITERATIONS; i++) {
            const tempHash = await this.sha256(this.bufferToHex(hashedValue));
            hashedValue = this.xorBuffers(hashedValue, tempHash);
        }
        
        return this.bufferToHex(hashedValue);
    }
} 