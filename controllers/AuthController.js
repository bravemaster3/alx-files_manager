// controllers/AuthController.js

import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { redisClient } from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    const userCollection = dbClient.db.collection('users');
    const user = await userCollection.findOne({ email, password: sha1(password) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = uuidv4();
    const key = `auth_${token}`;

    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

    res.json({ token: accessToken });
    res.end();
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      res.end();
      return;
    }

    await redisClient.del(key);
    res.status(204).end();
  }
}

export default AuthController;
