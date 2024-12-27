const app = require('./fan-submissions/user/fan-submissions-logic-index.js');  // Import the app from the correct path
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set the port from environment variables or default to 3000
const PORT = process.env.PORT || 3000;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
