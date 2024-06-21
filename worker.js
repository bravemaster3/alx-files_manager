// import fs from 'fs/promises';
import fs from 'fs';
import { promisify } from 'util';
import imageThumbnail from 'image-thumbnail';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');
const writeFile = promisify(fs.writeFile);

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: new ObjectId(fileId), userId: new ObjectId(userId) });

  if (!file) {
    throw new Error('File not found');
  }

  const thumbnailSizes = [500, 250, 100];

  await Promise.all(thumbnailSizes.map(async (size) => {
    const options = { width: size };
    const thumbnail = await imageThumbnail(file.localPath, options);
    const thumbnailPath = `${file.localPath}_${size}`;
    await writeFile(thumbnailPath, thumbnail);
  }));

  console.log(`Thumbnails generated for file ${fileId}`);
});

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const user = await dbClient.db.collection('users').findOne({ _id: new ObjectId(userId) });

  if (!user) {
    throw new Error('User not found');
  }

  console.log(`Welcome ${user.email}!`);
});

export { fileQueue, userQueue };
