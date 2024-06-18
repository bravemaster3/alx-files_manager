// utils/db.js

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    
    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        console.log('Connected successfully to MongoDB');
      })
      .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
      });
  }

  isAlive() {
    return this.client && this.client.isConnected();
  }

  async nbUsers() {
    if (!this.isAlive()) {
      return 0;
    }
    const usersCollection = this.db.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    if (!this.isAlive()) {
      return 0;
    }
    const filesCollection = this.db.collection('files');
    return filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
