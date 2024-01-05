import { MongoClient } from "mongodb";

export default class DatabaseController
{
    constructor(host, port, database, username, password)
    {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.databaseName = database;

        this.client = null;
        this.database = null;
    }

    async connect()
    {
        if (this.username == null || this.password == null)
        {
            this.client = new MongoClient(`mongodb://${this.host}:${this.port}`);
            await this.client.connect();
            this.database = this.client.db(this.databaseName);
            return this;
        }
        this.client = new MongoClient(`mongodb://${this.username}:${this.password}@${this.host}:${this.port}`);
        await this.client.connect();
        this.database = this.client.db(this.database);

        return this;
    }

    async getCollection(collection)
    {
        return this.database.collection(collection);
    }

    async getDocument(collection, query)
    {
        let result = await this.database.collection(collection).find(query).toArray();
        if (result.length == 0)
            return null;
        return result[0];
    }

    async getDocuments(collection, query)
    {
        return await this.database.collection(collection).find(query).toArray();
    }

    async getDocumentsSkip(collection, query, skip, limit)
    {
        if (!limit)
            limit = 1;
        if (!skip)
            skip = 0;

        let result = await this.database.collection(collection).find(query).limit(limit).skip(skip).toArray();
        return result;
    }

    async checkDocumentExists(collection, query)
    {
        let result = await this.database.collection(collection).find(query).toArray();
        return result.length > 0;
    }

    async insertDocument(collection, document)
    {
        await this.database.collection(collection).insertOne(document);
    }

    async deleteDocument(collection, query)
    {
        await this.database.collection(collection).deleteOne(query);
    }

    async deleteDocuments(collection, query)
    {
        await this.database.collection(collection).deleteMany(query);
    }

    async updateDocument(collection, query, update)
    {
        let _collection = await this.getCollection(collection, query);
        let result = await _collection.updateOne(query, update);
        return result;
    }
}