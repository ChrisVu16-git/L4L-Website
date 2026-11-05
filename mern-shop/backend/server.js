import 'dotenv/config';
import connectDB from './config/db.js';
import app from './app.js';

try {
  await connectDB();
} catch (error) {
  console.error('Failed to connect to MongoDB:', error.message);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
