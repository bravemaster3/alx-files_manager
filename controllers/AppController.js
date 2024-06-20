import { redisClient } from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static getStatus(req, res) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      res.status(200).json({ redis: true, db: true });
      res.end();
    }
  }

  static async getStats(req, res) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).json({ users, files });
    res.end();
  }
}

export default AppController;
