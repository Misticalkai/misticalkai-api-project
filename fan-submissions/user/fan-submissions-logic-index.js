const express = require('express');
const multer = require('multer');
const { Client } = require('pg'); // PostgreSQL client
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const { S3Client } = require('@aws-sdk/client-s3'); // AWS SDK v3
const multerS3 = require('multer-s3'); // Multer S3 storage engine (this handles R2)

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: 'https://misticalkai.com', // Allow only requests from this domain
  methods: ['POST'],                // Allow only POST requests
  allowedHeaders: ['Content-Type'],  // Allow only the content-type header
};

// Middleware setup
app.use(cors(corsOptions));          // Apply the CORS configuration
app.use(bodyParser.json());

// Set up AWS SDK for Cloudflare R2 (v3 SDK)
const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT_URL,  // Use the R2 endpoint from .env
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID, // R2 Access Key from .env
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, // R2 Secret Key from .env
  },
  region: 'auto', // Region for R2
});

// Set up multer with Cloudflare R2 storage
const upload = multer({
  storage: multerS3({
    s3: s3,  // Use the initialized S3Client instance here
    bucket: 'fan-art-submissions-storage',  // Correct bucket name here (fan-art-submissions-storage)
    acl: 'public-read',  // Set the access control to public read
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = Date.now() + '-' + file.originalname;
      cb(null, filename); // Set the file name in R2
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif']; // Allowed mime types
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(new Error('Invalid file type. Only .png, .jpeg, and .gif are allowed.'), false); // Reject the file
    }
  }, // Apply the file filter
});

// Set up PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Use DATABASE_URL from .env
  ssl: {
    rejectUnauthorized: false, // Disables SSL certificate validation (for testing purposes)
  },
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('Error connecting to PostgreSQL:', err));

// POST endpoint to upload fan art
app.post('/v1/user/view-form/submit-fan-mail', upload.single('fanArt'), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const file = req.file ? req.file.location : null; // R2 stores the file location in `req.file.location`

    // Log the submission data (for debugging)
    console.log('Received fan submission:', { name, email, message, file });

    // Insert fan submission into the PostgreSQL database
    const query = 'INSERT INTO fan_submissions(name, email, message, file) VALUES($1, $2, $3, $4) RETURNING *';
    const values = [name, email, message, file];
    const result = await client.query(query, values);

    res.status(200).json({ message: 'Fan submission received!', submission: result.rows[0] });
  } catch (err) {
    console.error('Error submitting fan art:', err.message);  // Log the error message for better clarity
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

// Export the app for use in other files (like server.js for Vercel)
module.exports = app;
