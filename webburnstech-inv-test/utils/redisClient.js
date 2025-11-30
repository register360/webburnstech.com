// utils/redisClient.js
const redis = require('redis');

// Create a simple in-memory store as fallback
class MemoryStore {
    constructor() {
        this.store = new Map();
        console.log('MemoryStore initialized - Redis not available');
    }

    async setEx(key, seconds, value) {
        this.store.set(key, value);
        setTimeout(() => {
            this.store.delete(key);
        }, seconds * 1000);
        return 'OK';
    }

    async get(key) {
        return this.store.get(key) || null;
    }

    async del(key) {
        return this.store.delete(key);
    }

    async exists(key) {
        return this.store.has(key);
    }

    async connect() {
        console.log('MemoryStore connected');
        return this;
    }

    async disconnect() {
        console.log('MemoryStore disconnected');
        this.store.clear();
    }

    isOpen() {
        return true;
    }
}

// Try to use Redis if available, otherwise use memory store
let client;

if (process.env.REDIS_URL) {
    try {
        const redisClient = redis.createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 10000,
                reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
            }
        });

        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err.message);
            console.log('Falling back to MemoryStore');
            client = new MemoryStore();
        });

        redisClient.on('connect', () => {
            console.log('Redis Client Connected');
            client = redisClient;
        });

        // Connect to Redis
        (async () => {
            try {
                await redisClient.connect();
            } catch (err) {
                console.error('Failed to connect to Redis:', err.message);
                client = new MemoryStore();
            }
        })();
    } catch (error) {
        console.error('Redis initialization failed:', error.message);
        client = new MemoryStore();
    }
} else {
    console.log('No REDIS_URL provided, using MemoryStore');
    client = new MemoryStore();
}

// Default to memory store if client is not set
if (!client) {
    client = new MemoryStore();
}

module.exports = client;
