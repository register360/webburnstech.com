// memoryStore.js
class MemoryStore {
  constructor() {
    this.store = new Map();
    this.isOpen = true;
    console.log('MemoryStore initialized - using in-memory storage');
  }

  async setEx(key, seconds, value) {
    this.store.set(key, value);
    
    // Auto-expire after seconds
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

  // For debugging
  getSize() {
    return this.store.size;
  }

  // For debugging - get all keys
  getKeys() {
    return Array.from(this.store.keys());
  }
}

// Create singleton instance
const memoryStore = new MemoryStore();

module.exports = memoryStore;
