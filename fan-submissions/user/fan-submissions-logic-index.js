const express = require('express');
const multer = require('multer');
const { Client } = require('pg'); // PostgreSQL client
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk'); // AWS SDK for Cloudflare R2
const multerS3 = require('multer-s3'); // Multer S3 storage engine

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

// Set up AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT_URL,  // Use the R2 endpoint from .env
  accessKeyId: process.env.R2_ACCESS_KEY_ID, // R2 Access Key from .env
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, // R2 Secret Key from .env
  region: 'auto', // Region for R2
  signatureVersion: 'v4',
});

// File filter to restrict allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif']; // Allowed mime types
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Invalid file type. Only .png, .jpeg, and .gif are allowed.'), false); // Reject the file
  }
};

// Set up multer with Cloudflare R2 storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'fan-art-submissions-storage',  // Correct bucket name here (fan-art-submissions-storage)
    acl: 'public-read',  // Set the access control to public read
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = Date.now() + '-' + file.originalname;
      cb(null, filename); // Set the file name in R2
    }
  }),
  fileFilter: fileFilter, // Apply the file filter
});

// Set up PostgreSQL client
const client = new Client({
  connectionString: process.env.DATABASE_URL, // Use DATABASE_URL from .env
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
    console.error('Error submitting fan art:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the Express server (For local testing)
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

module.exports = app; // Export the app for use in other files (like server.js for Vercel)
