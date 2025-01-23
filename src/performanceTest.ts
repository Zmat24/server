import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:'+process.env.PORT;
const COUNT = 1000;

async function runPerformanceTest() {
    console.log('\x1b[34m=== Starting Performance Test ===\x1b[0m');
    
    let createdUserIds: string[] = [];

    const createTest = async (count: number) => {
        const startTime = performance.now();
        const promises = [];

        for (let i = 0; i < count; i++) {
            const promise = fetch(`${BASE_URL}/user/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Test User ${i}`,
                    email: `test${i}@example.com`,
                    password: `password${i}d78da@24`
                })
            }).then(res => res.json());
            promises.push(promise);
        }

        const results = await Promise.all(promises);
        createdUserIds = results.map(result => result.id);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\x1b[32m✓ Created ${count} records in ${duration.toFixed(2)} seconds\x1b[0m`);
        console.log(`\x1b[32m✓ Average time per request: ${(duration / count * 1000).toFixed(2)}ms\x1b[0m`);
        console.log(`\x1b[32m✓ Requests per second: ${(count / duration).toFixed(2)}\x1b[0m`);
    };

    const updateTest = async (count: number) => {
        if (createdUserIds.length === 0) {
            console.log('\x1b[31mNo users available to update\x1b[0m');
            return;
        }

        const startTime = performance.now();
        const promises = [];

        for (let i = 0; i < count; i++) {
            const userId = createdUserIds[i % createdUserIds.length];
            const promise = fetch(`${BASE_URL}/user/update/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Updated User ${i}`,
                    email: `updated${i}@example.com`
                })
            });
            promises.push(promise);
        }

        await Promise.all(promises);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\x1b[32m✓ Updated ${count} records in ${duration.toFixed(2)} seconds\x1b[0m`);
        console.log(`\x1b[32m✓ Average time per request: ${(duration / count * 1000).toFixed(2)}ms\x1b[0m`);
        console.log(`\x1b[32m✓ Requests per second: ${(count / duration).toFixed(2)}\x1b[0m`);
    };

    const readTest = async (ids: number[]) => {
        const startTime = performance.now();
        const promises = [];

        for (const id of ids) {
            const promise = fetch(`${BASE_URL}/user/view/${id}`).then(async (res) => {
                if (!res.ok) throw new Error(`Read failed for ID ${id}: ${await res.text()}`);
                return res.json();
            });
            promises.push(promise);
        }

        await Promise.all(promises);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\x1b[32m✓ Read ${ids.length} records in ${duration.toFixed(2)} seconds\x1b[0m`);
        console.log(`\x1b[32m✓ Average time per request: ${(duration / ids.length * 1000).toFixed(2)}ms\x1b[0m`);
        console.log(`\x1b[32m✓ Requests per second: ${(ids.length / duration).toFixed(2)}\x1b[0m`);
    };

    const searchTest = async (count: number) => {
        const startTime = performance.now();
        const promises = [];

        // تست جستجو بر اساس نام
        for (let i = 0; i < count; i++) {
            const namePromise = fetch(`${BASE_URL}/user/find?field=name&value=Updated User ${i}`).then(async (res) => {
                if (!res.ok) throw new Error(`Name search failed: ${await res.text()}`);
                return res.json();
            });
            promises.push(namePromise);
        }

        for (let i = 0; i < count; i++) {
            const emailPromise = fetch(`${BASE_URL}/user/find?field=email&value=updated${i}@example.com`).then(async (res) => {
                if (!res.ok) throw new Error(`Email search failed: ${await res.text()}`);
                return res.json();
            });
            promises.push(emailPromise);
        }

        await Promise.all(promises);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;
        const totalSearches = count * 2;

        console.log(`\x1b[32m✓ Performed ${totalSearches} searches in ${duration.toFixed(2)} seconds\x1b[0m`);
        console.log(`\x1b[32m✓ Average time per search: ${(duration / totalSearches * 1000).toFixed(2)}ms\x1b[0m`);
        console.log(`\x1b[32m✓ Searches per second: ${(totalSearches / duration).toFixed(2)}\x1b[0m`);
    };

    const deleteTest = async (ids: number[]) => {
        const startTime = performance.now();
        const promises = [];

        for (const id of ids) {
            const promise = fetch(`${BASE_URL}/user/delete/${id}`, {
                method: 'DELETE'
            }).then(async (res) => {
                if (!res.ok) throw new Error(`Delete failed for ID ${id}: ${await res.text()}`);
                return res;
            });
            promises.push(promise);
        }

        await Promise.all(promises);
        const endTime = performance.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\x1b[32m✓ Deleted ${ids.length} records in ${duration.toFixed(2)} seconds\x1b[0m`);
        console.log(`\x1b[32m✓ Average time per request: ${(duration / ids.length * 1000).toFixed(2)}ms\x1b[0m`);
        console.log(`\x1b[32m✓ Requests per second: ${(ids.length / duration).toFixed(2)}\x1b[0m`);
    };

    try {
        console.log('\x1b[33m--- Testing Bulk Insert Performance ---\x1b[0m');
        await createTest(COUNT);
        
        // console.log('\x1b[33m--- Testing Bulk Update Performance ---\x1b[0m');
        // await updateTest(COUNT);
        
        console.log('\x1b[33m--- Testing Bulk Read Performance ---\x1b[0m');
        await readTest(createdUserIds.map(id => parseInt(id)));
        
        // console.log('\x1b[33m--- Testing Search Performance ---\x1b[0m');
        // await searchTest(createdUserIds.length);
        
        console.log('\x1b[33m--- Testing Bulk Delete Performance ---\x1b[0m');
        await deleteTest(createdUserIds.map(id => parseInt(id)));
        
        console.log('\x1b[34m=== Performance Test Completed Successfully ===\x1b[0m');
    } catch (error) {
        console.error('\x1b[31mTest Error:\x1b[0m', error);
        process.exit(1);
    }
}

runPerformanceTest(); 