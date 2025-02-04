module.exports = async () => {
  const mongoServer = global.__MONGO_SERVER__;
  
  if (mongoServer) {
    try {
      await mongoServer.stop();
      console.log('MongoDB Memory Server stopped successfully');
    } catch (error) {
      console.error('Failed to stop MongoDB Memory Server:', error);
    }
  }
};
