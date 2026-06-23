const mongoose = require('mongoose');
const Message = require('./dist/modules/chat/message.model').default;
const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const msg = await Message.findOne({ type: 'image' }).sort({ createdAt: -1 });
  console.log(JSON.stringify(msg, null, 2));
  process.exit(0);
}
check();
