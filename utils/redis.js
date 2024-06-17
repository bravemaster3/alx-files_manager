#!/usr/bin/node

const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.connected = false;
    this.client.on('connect', () => {
      this.connected = true;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    try {
      const val = await getAsync(key);
      return val;
    } catch (err) {
      console.error('Error getting key:', key, err);
      throw err;
    }
  }

  async set(key, value, duration) {
    const setexAsync = promisify(this.client.setex).bind(this.client);
    try {
      const reply = await setexAsync(key, duration, value);
      return reply;
    } catch (err) {
      console.error('Error setting key:', key, err);
      throw err;
    }
  }

  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    try {
      const reply = await delAsync(key);
      return reply;
    } catch (err) {
      console.error('Error deleting key:', key, err);
      throw err;
    }
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
