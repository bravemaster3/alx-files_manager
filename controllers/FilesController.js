import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import Bull from 'bull';
import { generate } from 'image-thumbnail';
import { redisClient } from '../utils/redis';
import dbClient from '../utils/db';

const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const validTypes = ['folder', 'file', 'image'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      try {
        const result = await dbClient.db.collection('files').insertOne(fileData);
        return res.status(201).json({
          id: result.insertedId,
          userId,
          name,
          type,
          isPublic,
          parentId,
        });
      } catch (error) {
        console.error('Error while creating folder:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    const localPath = path.join(FOLDER_PATH, uuidv4());
    try {
      fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

      // Add job to Bull queue for thumbnail generation
      await fileQueue.add({ userId, fileId: localPath });

      fileData.localPath = localPath;

      const result = await dbClient.db.collection('files').insertOne(fileData);

      // Return response before processing completes
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic,
        parentId,
        localPath,
      });
    } catch (error) {
      console.error('Error while uploading file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    try {
      const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file);
    } catch (error) {
      console.error('Error while fetching file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const skip = page * pageSize;

    try {
      const files = await dbClient.db.collection('files')
        .find({ userId: new ObjectId(userId), parentId })
        .skip(skip)
        .limit(pageSize)
        .toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error('Error while fetching files:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    try {
      const file = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: new ObjectId(fileId), userId: new ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' },
      );

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file.value);
    } catch (error) {
      console.error('Error while updating file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    try {
      const file = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: new ObjectId(fileId), userId: new ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' },
      );

      if (!file.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file.value);
    } catch (error) {
      console.error('Error while updating file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const token = req.headers['x-token'];

    try {
      const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (!file.isPublic) {
        if (!token) {
          return res.status(404).json({ error: 'Not found' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId || userId.toString() !== file.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      const filePath = file.localPath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      fs.createReadStream(filePath).pipe(res);

      return res.status(500).json({ error: 'Unexpected error' }); // Added default response
    } catch (error) {
      console.error('Error while fetching file:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

// Worker function to process jobs from fileQueue
fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];
  const promises = thumbnailSizes.map((size) => {
    const outputPath = `${file.localPath}_${size}`;
    return generate({
      source: file.localPath,
      width: size,
      height: size,
      destination: outputPath,
    });
  });

  await Promise.all(promises);
});

export default FilesController;
