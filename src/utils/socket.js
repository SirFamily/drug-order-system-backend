let io;

const setIo = (ioInstance) => {
  io = ioInstance;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

module.exports = { setIo, getIo };
