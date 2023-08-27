import { MongoClient } from "mongodb";

export default class DatabaseController
{
    constructor(host, port, database, username, password)
    {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.database = database;

        this.client = null;
        this.database = null;

        this.connect();
    }

    async connect()
    {
        if (this.username == null || this.password == null)
        {
            this.client = new MongoClient(`mongodb://${this.host}:${this.port}`);
            await this.client.connect();
            this.database = this.client.db(this.database);
            return;
        }
        this.client = new MongoClient(`mongodb://${this.username}:${this.password}@${this.host}:${this.port}`);
        await this.client.connect();
        this.database = this.client.db(this.database);
    }

    async getCollection(collection)
    {
        return this.database.collection(collection);
    }

    async getDocument(collection, query)
    {
        return await this.database.collection(collection).findOne(query).toArray();
    }

    async getDocuments(collection, query)
    {
        return await this.database.collection(collection).find(query).toArray();
    }
}