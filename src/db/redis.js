import { createClient } from 'redis';
import { PresetOutput } from "utilities/output";

export default class RedisController {
    constructor(host) {
        this.Output = new PresetOutput("redis");
        this.host = host;
        this.redis = null;
    }

    async connect() {
        if (this.redis) return false;
        const url = /^rediss?:\/\//.test(this.host) ? this.host : `redis://${this.host}`;
        this.redis = createClient({
            url,
            socket: { connectTimeout: 5000, reconnectStrategy: (retries) => Math.min(retries * 500, 5000) }
        });
        this.redis.on("error", (e) => this.Output.Warn(`Redis error: ${e.message}`));
        await this.redis.connect();
        this.Output.Log("Redis connected.");
    }

    async disconnect() {
        if (!this.redis) return false;
        await this.redis.disconnect();
        this.Output.Log("Redis disconnected.");
    }

    async set(key, value) {
        if (!this.redis) throw Error("RedisController: You are not connected.");
        return await this.redis.set(key, value);
    }

    async get(key) {
        if (!this.redis) throw Error("RedisController: You are not connected.");
        return await this.redis.get(key);
    }

    async rawSet(...params) {
        if (!this.redis) throw Error("RedisController: You are not connected.");
        return await this.redis.set(...params);
    }

    async rawGet(...params) {
        if (!this.redis) throw Error("RedisController: You are not connected.");
        return await this.redis.get(...params);
    }

    async sendCommand(...params) {
        if (!this.redis) throw Error("RedisController: You are not connected.");
        return await this.redis.sendCommand(...params);
    }

}