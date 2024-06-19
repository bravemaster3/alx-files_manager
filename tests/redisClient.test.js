import { expect } from 'chai';
import { redisClient } from '../utils/redis';

describe('redisClient', () => {
  it('should set and get a value from Redis', async () => {
    await redisClient.set('test_key', 'test_value');
    const value = await redisClient.get('test_key');
    expect(value).to.equal('test_value');
  });

  it('should handle expiration correctly', async () => {
    await redisClient.set('expiring_key', 'value', 'EX', 1); // Expires in 1 second
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for expiration
    const value = await redisClient.get('expiring_key');
    expect(value).to.be.null;
  });
});
