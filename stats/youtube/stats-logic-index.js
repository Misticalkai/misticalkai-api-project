// Load environment variables from .env file
require('dotenv').config();

// Import necessary libraries
const axios = require('axios');
const express = require('express'); // Import Express
const NodeCache = require('node-cache'); // Import node-cache for caching
const rateLimit = require('express-rate-limit'); // Import rate limiter
const cors = require('cors'); // Import CORS middleware
const app = express(); // Initialize Express app
const port = 3000; // Define the port to run the server on

// YouTube Channel ID and API Key
const channelId = 'UC_sAYoFHtdQxA7T0GqG6dFg';  // Replace with your YouTube Channel ID
const apiKey = process.env.YOUTUBE_API_KEY;  // API key loaded from .env file

// Create a cache instance with a default TTL of 20 seconds
const cache = new NodeCache({ stdTTL: 20, checkperiod: 25 }); // TTL set to 20 seconds

// Create a rate limiter that allows 100 requests per 1 minute
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute (This is the correct value you wanted, not 15 minutes)
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests, please try again later.'
});

// Apply CORS middleware
app.use(cors({
    origin: 'https://misticalkai.com' // Allow requests from this domain
}));

// Apply the rate limiter to all requests
app.use(limiter);

// Function to fetch live subscriber count from YouTube API
async function getLiveSubscriberCount(forceRefresh = false) {
    let subscriberCount;

    // Check cache if forceRefresh is not enabled
    if (!forceRefresh) {
        subscriberCount = cache.get('subscriberCount');
        if (subscriberCount) {
            console.log('Using cached subscriber count');
            return subscriberCount;
        }
    }

    try {
        // If not in cache or forced refresh, fetch from YouTube API
        const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'statistics',
                id: channelId,
                key: apiKey
            }
        });

        // Extract subscriber count from API response
        subscriberCount = response.data.items[0].statistics.subscriberCount;

        // Cache the result for 20 seconds
        cache.set('subscriberCount', subscriberCount);
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
    // Check for the 'forceRefresh' query parameter in the URL
    const forceRefresh = req.query.forceRefresh === 'true';
    const subscriberCount = await getLiveSubscriberCount(forceRefresh);
    res.json({ subscriberCount }); // Send the subscriber count as JSON
});

// Start the Express server on the defined port
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});






