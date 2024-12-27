// fan-submissions-logic-index.js
const express = require('express');
const multer = require('multer');
const { Client } = require('pg'); // PostgreSQL client
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: 'https://misticalkai.com', // Allow only requests from this domain
  methods: ['GET', 'POST'],         // Allow GET and POST requests
  allowedHeaders: ['Content-Type'],  // Allow only the content-type header
};

// Middleware setup
app.use(cors(corsOptions));          // Apply the CORS configuration
app.use(bodyParser.json());

// Configure file storage for multer (handle image uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory where files will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // File naming convention
  }
});

// Initialize multer for file uploads
const upload = multer({ storage: storage });

// Set up PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('Error connecting to PostgreSQL:', err));

// POST endpoint to upload fan art
app.post('/v1/user/view-form/submit-fan-mail', upload.single('fanArt'), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const file = req.file ? req.file.path : null;

    // Insert fan submission into the PostgreSQL database
    const query = 'INSERT INTO fan_submissions(name, email, message, file) VALUES($1, $2, $3, $4) RETURNING *';
    const values = [name, email, message, file];
    const result = await client.query(query, values);

    res.status(200).json({ message: 'Fan submission received!', submission: result.rows[0] });
  } catch (err) {
    console.error('Error submitting fan art:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
