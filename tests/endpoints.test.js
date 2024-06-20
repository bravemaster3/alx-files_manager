import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import dbClient from '../utils/db'; // Import your dbClient for setup and teardown
import server from '../server'; // Adjust this import based on your application setup

chai.use(chaiHttp);

describe('endpoints', () => {
  // Setup and teardown hooks for database or other necessary setup
  before(async () => {
    // Perform setup tasks like clearing collections, seeding data, etc.
    await dbClient.db.collection('test_files').deleteMany({});
  });

  after(async () => {
    // Perform teardown tasks like cleaning up after tests
    await dbClient.db.collection('test_files').deleteMany({});
  });

  describe('GET /status', () => {
    it('should return status 200', async () => {
      const res = await chai.request(server).get('/status');
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ status: 'OK' });
    });
  });

  // Add tests for other endpoints similarly
});
