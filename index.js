// Load environment variables from .env file
require('dotenv').config();

// Import necessary libraries
const axios = require('axios');
const express = require('express'); // Import Express
const app = express(); // Initialize Express app
const port = 3000; // Define the port to run the server on

// YouTube Channel ID and API Key
const channelId = 'UC_sAYoFHtdQxA7T0GqG6dFg';  // Replace with your YouTube Channel ID
const apiKey = process.env.YOUTUBE_API_KEY;  // API key loaded from .env file

// Function to fetch live subscriber count from YouTube API
async function getLiveSubscriberCount() {
    try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'statistics',
                id: channelId,
                key: apiKey
            }
        });

        // Extract subscriber count from API response
        const subscriberCount = response.data.items[0].statistics.subscriberCount;
        return subscriberCount;
    } catch (error) {
        console.error('Error fetching subscriber count:', error);
        return 'Error'; // If there is an error, return 'Error'
    }
}

// Serve static files (optional, for future HTML files)
app.use(express.static('public'));

// Define a route that returns live subscriber count in JSON format
app.get('/youtube/live-sub-count', async (req, res) => {
    const subscriberCount = await getLiveSubscriberCount();
    res.json({ subscriberCount }); // Send the subscriber count as JSON
});

// Start the Express server on the defined port
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});


