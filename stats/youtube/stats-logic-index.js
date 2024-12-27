// Load environment variables from .env file
require('dotenv').config();

// Import necessary libraries
const axios = require('axios');
const express = require('express');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const port = 3000;

// YouTube Channel ID and API Key
const channelId = 'UC_sAYoFHtdQxA7T0GqG6dFg'; // Replace with your YouTube Channel ID
const apiKey = process.env.YOUTUBE_API_KEY; // API key loaded from .env file

// Create a cache instance with a default TTL of 20 seconds
const cache = new NodeCache({ stdTTL: 20, checkperiod: 25 }); // TTL set to 20 seconds

// Create a rate limiter that allows 100 requests per 1 minute
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
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
        // Fetch from YouTube API if not in cache or forced refresh
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
app.get('/v1/stats/youtube/live-sub-count', async (req, res) => {
    const forceRefresh = req.query.forceRefresh === 'true'; // Check for the 'forceRefresh' query parameter
    const subscriberCount = await getLiveSubscriberCount(forceRefresh);

    // Log analytics event
    console.log(`Subscriber count served: ${subscriberCount}`);
    
    // Send the subscriber count as JSON
    res.json({ subscriberCount });
});

// Start the Express server on the defined port
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
