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
    const key = `auth_${accessToken}`;

    await redisClient.set(key, user._id.toString(), 24 * 60 * 60);

    return res.json({ token: accessToken });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(key);
    return res.status(204).send();
  }
}

export default AuthController;
