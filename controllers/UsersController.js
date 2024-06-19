import sha1 from 'sha1';
import { ObjectId } from 'mongodb'; // Import ObjectId from mongodb
import dbClient from '../utils/db';
import { redisClient } from '../utils/redis';
import { userQueue } from '../worker';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const userCollection = dbClient.db.collection('users');
    const existingUser = await userCollection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Already exists' });
    }

    const hashedPassword = sha1(password);
    const newUser = { email, password: hashedPassword };

    const result = await userCollection.insertOne(newUser);
    const userId = result.insertedId;

    // Enqueue job for sending welcome email
    await userQueue.add({ userId });

    return res.status(201).json({ id: userId, email: newUser.email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userCollection = dbClient.db.collection('users');
    const user = await userCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

export default UsersController;
