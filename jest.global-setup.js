const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  try {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Store the server and URI for teardown
    global.__MONGO_URI__ = mongoUri;
    global.__MONGO_SERVER__ = mongoServer;

    console.log('MongoDB Memory Server started successfully');
  } catch (error) {
    console.error('Failed to start MongoDB Memory Server:', error);
    throw error;
  }
};
