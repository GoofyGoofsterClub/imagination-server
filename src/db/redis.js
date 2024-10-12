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
        this.redis = await createClient({
            url: this.host
        });
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