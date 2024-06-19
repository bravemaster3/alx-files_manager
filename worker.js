// worker.js
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';
import Queue from 'bull';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async job => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });

  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];

  await Promise.all(thumbnailSizes.map(async size => {
    const options = { width: size };
    const thumbnail = await imageThumbnail(file.localPath, options);
    const thumbnailPath = `${file.localPath}_${size}`;
    await fs.writeFile(thumbnailPath, thumbnail);
  }));

  console.log(`Thumbnails generated for file ${fileId}`);
});
