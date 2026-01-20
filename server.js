const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// YouTube Data API v3 Configuration
const YOUTUBE_API_KEY = 'AIzaSyArZWzXMBHuNX3Bq6c4OdDgMvn2UNX-fBw';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to extract channel ID from various URL formats
async function getChannelId(channelUrl) {
    // Handle different URL formats:
    // https://www.youtube.com/@username
    // https://www.youtube.com/channel/UCxxxxxx
    // https://www.youtube.com/c/ChannelName
    // https://www.youtube.com/user/Username

    if (channelUrl.includes('/channel/')) {
        // Direct channel ID
        const match = channelUrl.match(/\/channel\/([^\/\?]+)/);
        return match ? match[1] : null;
    }

    // For @username, /c/, or /user/ formats, we need to search
    let searchQuery = '';

    if (channelUrl.includes('/@')) {
        const match = channelUrl.match(/\/@([^\/\?]+)/);
        searchQuery = match ? match[1] : '';
    } else if (channelUrl.includes('/c/')) {
        const match = channelUrl.match(/\/c\/([^\/\?]+)/);
        searchQuery = match ? match[1] : '';
    } else if (channelUrl.includes('/user/')) {
        const match = channelUrl.match(/\/user\/([^\/\?]+)/);
        searchQuery = match ? match[1] : '';
    }

    if (!searchQuery) {
        throw new Error('Could not parse channel URL');
    }

    // Use Search API to find the channel
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    if (data.items && data.items.length > 0) {
        return data.items[0].snippet.channelId;
    }

    throw new Error('Channel not found');
}

// Helper function to get channel's playlist ID based on video type
// Playlist prefixes: UULF = Long Videos, UUSH = Shorts, UU = All Uploads
async function getPlaylistIdByType(channelId, videoType = 'long') {
    // Channel IDs start with "UC" - we replace the prefix based on video type
    const baseId = channelId.substring(2); // Remove "UC" prefix

    if (videoType === 'shorts') {
        // Shorts playlist: UUSH prefix
        return 'UUSH' + baseId;
    } else {
        // Long videos playlist: UULF prefix
        return 'UULF' + baseId;
    }
}

// Helper function to get videos from playlist
async function getPlaylistVideos(playlistId, maxResults = 50, pageToken = null) {
    let url = `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data;
}

// Helper function to get video statistics and details (views, duration)
async function getVideoDetails(videoIds) {
    const url = `${YOUTUBE_API_BASE}/videos?part=statistics,snippet,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message);
    }

    return data.items || [];
}

app.post('/api/calculate', async (req, res) => {
    let { channelUrl, skipMonths, videoCount, videoType } = req.body;

    // Validate inputs
    if (!channelUrl) {
        return res.status(400).json({ error: 'Channel URL is required' });
    }

    skipMonths = parseInt(skipMonths) || 3;
    videoCount = parseInt(videoCount) || 24;
    videoType = videoType || 'long'; // Default to long videos

    console.log(`Calculating for ${channelUrl}, type=${videoType}, skipping ${skipMonths} months, looking for ${videoCount} videos.`);

    try {
        // Step 1: Get Channel ID
        console.log('Step 1: Getting channel ID...');
        const channelId = await getChannelId(channelUrl);
        console.log('Channel ID:', channelId);

        // Step 2: Get Playlist ID based on video type
        console.log(`Step 2: Getting ${videoType} videos playlist...`);
        const playlistId = await getPlaylistIdByType(channelId, videoType);
        console.log('Playlist ID:', playlistId);

        // Step 3: Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - skipMonths);
        console.log('Cutoff date (videos must be older than):', cutoffDate.toISOString());

        // Step 4: Fetch videos until we have enough that are older than cutoff
        let collectedVideos = [];
        let pageToken = null;
        let totalFetched = 0;
        const maxIterations = 20; // Safety limit
        let iterations = 0;

        while (collectedVideos.length < videoCount && iterations < maxIterations) {
            iterations++;
            console.log(`Iteration ${iterations}: Fetching playlist items...`);

            const playlistData = await getPlaylistVideos(playlistId, 50, pageToken);
            const items = playlistData.items || [];
            totalFetched += items.length;

            if (items.length === 0) {
                console.log('No more videos in playlist');
                break;
            }

            // Get video IDs for statistics lookup
            const videoIds = items.map(item => item.contentDetails.videoId);

            // Get details for these videos (includes duration)
            const videoDetails = await getVideoDetails(videoIds);

            // Process each video
            for (const video of videoDetails) {
                const publishedAt = new Date(video.snippet.publishedAt);
                const viewCount = parseInt(video.statistics?.viewCount) || 0;
                const duration = video.contentDetails?.duration || 'PT0S';

                // Parse ISO 8601 duration to seconds
                const durationSeconds = parseDuration(duration);

                // Skip videos newer than cutoff
                if (publishedAt >= cutoffDate) {
                    continue;
                }

                // Skip videos with no view count (members-only, private, etc.)
                if (viewCount === 0 || !video.statistics?.viewCount) {
                    console.log(`Skipping (no views): ${video.snippet.title}`);
                    continue;
                }

                // Add to collected videos
                if (collectedVideos.length < videoCount) {
                    collectedVideos.push({
                        title: video.snippet.title,
                        videoId: video.id,
                        link: `https://www.youtube.com/watch?v=${video.id}`,
                        views: viewCount,
                        viewsFormatted: formatViews(viewCount),
                        publishedAt: publishedAt.toISOString(),
                        timeAgo: getTimeAgo(publishedAt),
                        duration: formatDuration(durationSeconds)
                    });
                    console.log(`[+] Added: ${video.snippet.title} (${viewCount} views, ${getTimeAgo(publishedAt)}, ${formatDuration(durationSeconds)})`);
                }
            }

            // Check for next page
            pageToken = playlistData.nextPageToken;
            if (!pageToken) {
                console.log('No more pages');
                break;
            }
        }

        console.log(`Total collected: ${collectedVideos.length} videos`);

        // Step 5: Calculate average
        let totalViews = 0;
        collectedVideos.forEach(v => totalViews += v.views);
        const averageViews = collectedVideos.length > 0 ? Math.round(totalViews / collectedVideos.length) : 0;

        res.json({
            success: true,
            channelId: channelId,
            totalIncluded: collectedVideos.length,
            averageViews: averageViews,
            averageViewsFormatted: formatViews(averageViews),
            detailedVideos: collectedVideos
        });

    } catch (error) {
        console.error('API Error:', error.message);
        res.status(500).json({ error: 'Failed to calculate. Error: ' + error.message });
    }
});

// Helper function to format view counts
function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M views';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K views';
    }
    return views + ' views';
}

// Helper function to get "time ago" string
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        return `${diffDays} days ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    }
}

// Helper function to parse ISO 8601 duration (PT1H2M30S) to seconds
function parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
}

// Helper function to format duration in human-readable format
function formatDuration(seconds) {
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}:${mins.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Start server only if running locally (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
