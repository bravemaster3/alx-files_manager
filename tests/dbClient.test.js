import { expect } from 'chai';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';

describe('dbClient', () => {
  it('should insert and find a document in MongoDB', async () => {
    const document = { name: 'Test Document' };
    const result = await dbClient.db.collection('test_collection').insertOne(document);
    expect(result.insertedCount).to.equal(1);

    const insertedId = result.insertedId;
    const insertedDocument = await dbClient.db.collection('test_collection').findOne({ _id: new ObjectId(insertedId) });
    expect(insertedDocument.name).to.equal('Test Document');
  });
});
