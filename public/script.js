// Track states
let selectedVideoType = 'long';
let selectedPlatform = 'youtube';
let selectedCalcMode = 'manual';
let selectedCalcVideoType = 'long';  // Calculator video type (long/shorts)
let hasCommission = false;
let hasReverseCommission = false;

// Constants for ROAS calculations
const INTEGRATION_SPV = 0.03;  // $0.03 per view for 15s integration
const FULL_VIDEO_SPV = 0.13;   // $0.13 per view for full video
const SHORTS_SPV = 0.01;       // $0.01 per view for shorts (full short video)
const TARGET_ROAS = 5;         // Target 5x ROAS

// Platform switching
function setPlatform(platform) {
    selectedPlatform = platform;

    // Update tab states
    document.getElementById('youtubeTab').classList.toggle('active', platform === 'youtube');
    document.getElementById('tiktokTab').classList.toggle('active', platform === 'tiktok');
    document.getElementById('calculatorTab').classList.toggle('active', platform === 'calculator');

    // Show/hide sections
    document.getElementById('youtubeSection').classList.toggle('hidden', platform !== 'youtube');
    document.getElementById('tiktokSection').classList.toggle('hidden', platform !== 'tiktok');
    document.getElementById('calculatorSection').classList.toggle('hidden', platform !== 'calculator');

    // Hide all results when switching
    document.getElementById('results').classList.add('hidden');
    document.getElementById('roasResults').classList.add('hidden');
    document.getElementById('maxBudgetResults').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
}

// Toggle button handler for YouTube video type
function setVideoType(type) {
    selectedVideoType = type;
    document.getElementById('longVideosBtn').classList.toggle('active', type === 'long');
    document.getElementById('shortsBtn').classList.toggle('active', type === 'shorts');
}

// Calculator mode toggle
function setCalcMode(mode) {
    selectedCalcMode = mode;
    document.getElementById('manualModeBtn').classList.toggle('active', mode === 'manual');
    document.getElementById('reverseModeBtn').classList.toggle('active', mode === 'reverse');
    document.getElementById('manualModeSection').classList.toggle('hidden', mode !== 'manual');
    document.getElementById('reverseModeSection').classList.toggle('hidden', mode !== 'reverse');

    // Hide results
    document.getElementById('roasResults').classList.add('hidden');
    document.getElementById('maxBudgetResults').classList.add('hidden');
}

// Calculator video type toggle (Long Videos / Shorts)
function setCalcVideoType(type) {
    selectedCalcVideoType = type;

    // Update button states
    document.getElementById('calcLongBtn').classList.toggle('active', type === 'long');
    document.getElementById('calcShortsBtn').classList.toggle('active', type === 'shorts');

    // Show/hide integration videos input (only for Long Videos)
    const integrationGroup = document.getElementById('integrationVideosGroup');
    const reverseIntegrationGroup = document.getElementById('reverseIntegrationGroup');

    if (type === 'shorts') {
        // Hide integration inputs for Shorts
        if (integrationGroup) integrationGroup.classList.add('hidden');
        if (reverseIntegrationGroup) reverseIntegrationGroup.classList.add('hidden');
        // Update label for Shorts
        const fullLabel = document.getElementById('fullVideosLabel');
        const reverseFullLabel = document.getElementById('reverseFullVideosLabel');
        if (fullLabel) fullLabel.textContent = '# Short Videos';
        if (reverseFullLabel) reverseFullLabel.textContent = '# Short Videos';
    } else {
        // Show integration inputs for Long Videos
        if (integrationGroup) integrationGroup.classList.remove('hidden');
        if (reverseIntegrationGroup) reverseIntegrationGroup.classList.remove('hidden');
        // Update label for Long Videos
        const fullLabel = document.getElementById('fullVideosLabel');
        const reverseFullLabel = document.getElementById('reverseFullVideosLabel');
        if (fullLabel) fullLabel.textContent = '# Full Videos (5+ min)';
        if (reverseFullLabel) reverseFullLabel.textContent = '# Full Videos (5+ min)';
    }

    // Hide results when switching
    document.getElementById('roasResults').classList.add('hidden');
    document.getElementById('maxBudgetResults').classList.add('hidden');
}

// Commission toggle for manual mode
function setCommission(value) {
    hasCommission = value;
    document.getElementById('commissionNo').classList.toggle('active', !value);
    document.getElementById('commissionYes').classList.toggle('active', value);
}

// Commission toggle for reverse mode
function setReverseCommission(value) {
    hasReverseCommission = value;
    document.getElementById('reverseCommissionNo').classList.toggle('active', !value);
    document.getElementById('reverseCommissionYes').classList.toggle('active', value);
}

// YouTube calculation
async function calculateViews() {
    const channelUrl = document.getElementById('channelUrl').value;
    const skipMonths = document.getElementById('skipMonths').value;
    const videoCount = document.getElementById('videoCount').value;

    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    const btn = document.getElementById('calculateBtn');

    // Reset UI
    results.classList.add('hidden');
    errorDiv.classList.add('hidden');
    loading.classList.remove('hidden');
    document.getElementById('loadingText').textContent = 'Fetching data from YouTube API...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelUrl, skipMonths, videoCount, videoType: selectedVideoType })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch data');
        }

        // Render Results
        document.getElementById('avgResult').textContent = data.averageViews.toLocaleString();
        document.getElementById('countResult').textContent = data.totalIncluded;

        // Show YouTube details, hide TikTok details
        document.getElementById('videoDetailsSection').classList.remove('hidden');
        document.getElementById('tiktokDetailsSection').classList.add('hidden');

        const videoList = document.getElementById('videoList');
        videoList.innerHTML = '';

        data.detailedVideos.forEach((video, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><a href="${video.link}" target="_blank">${video.title}</a></td>
                <td>${video.timeAgo}</td>
                <td>${video.duration || 'N/A'}</td>
                <td>${video.viewsFormatted}</td>
            `;
            videoList.appendChild(tr);
        });

        results.classList.remove('hidden');

    } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
        btn.disabled = false;
    }
}

// TikTok manual calculation
function calculateTiktokViews() {
    const viewsInput = document.getElementById('tiktokViews').value;
    const results = document.getElementById('results');
    const errorDiv = document.getElementById('error');

    results.classList.add('hidden');
    errorDiv.classList.add('hidden');

    const lines = viewsInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
        errorDiv.textContent = 'Please enter at least one view count.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const parsedViews = [];
    for (const line of lines) {
        const views = parseViewCount(line);
        if (views !== null) {
            parsedViews.push({ original: line, views: views });
        }
    }

    if (parsedViews.length === 0) {
        errorDiv.textContent = 'Could not parse any view counts.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const totalViews = parsedViews.reduce((sum, v) => sum + v.views, 0);
    const averageViews = Math.round(totalViews / parsedViews.length);

    document.getElementById('avgResult').textContent = averageViews.toLocaleString();
    document.getElementById('countResult').textContent = parsedViews.length;

    document.getElementById('videoDetailsSection').classList.add('hidden');
    document.getElementById('tiktokDetailsSection').classList.remove('hidden');

    const tiktokList = document.getElementById('tiktokViewsList');
    tiktokList.innerHTML = '';

    parsedViews.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'tiktok-view-item';
        div.innerHTML = `
            <div class="number">#${index + 1}</div>
            <div class="views">${formatViews(item.views)}</div>
        `;
        tiktokList.appendChild(div);
    });

    results.classList.remove('hidden');
}

// ROAS Calculator - Manual Mode
function calculateROAS() {
    const avgViews = parseFloat(document.getElementById('calcAvgViews').value) || 0;
    const integrationVideos = parseInt(document.getElementById('integrationVideos').value) || 0;
    const fullVideos = parseInt(document.getElementById('fullVideos').value) || 0;
    const quote = parseFloat(document.getElementById('fullQuote').value) || 0;

    const errorDiv = document.getElementById('error');

    if (avgViews <= 0) {
        errorDiv.textContent = 'Please enter average views.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (quote <= 0) {
        errorDiv.textContent = 'Please enter the YouTuber quote.';
        errorDiv.classList.remove('hidden');
        return;
    }

    errorDiv.classList.add('hidden');

    // Calculate sales based on video type
    let integrationSales = 0;
    let fullVideoSales = 0;

    if (selectedCalcVideoType === 'shorts') {
        // Shorts: Only full video sales using SHORTS_SPV
        fullVideoSales = avgViews * SHORTS_SPV * fullVideos;
    } else {
        // Long Videos: Both integration and full video sales
        integrationSales = avgViews * INTEGRATION_SPV * integrationVideos;
        fullVideoSales = avgViews * FULL_VIDEO_SPV * fullVideos;
    }
    const totalSales = integrationSales + fullVideoSales;

    // Calculate cost with commission
    const commission = hasCommission ? totalSales * 0.05 : 0;
    const totalCost = quote + commission;

    // Calculate CPM
    const totalVideos = selectedCalcVideoType === 'shorts' ? fullVideos : (integrationVideos + fullVideos);
    const cpm = totalVideos > 0 ? (quote / (avgViews / 1000) / totalVideos) : 0;

    // Calculate ROAS
    const roas = totalCost > 0 ? totalSales / totalCost : 0;

    // Update UI
    document.getElementById('integrationSales').textContent = formatCurrency(integrationSales);
    document.getElementById('fullVideoSales').textContent = formatCurrency(fullVideoSales);
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalCost').textContent = formatCurrency(totalCost);
    document.getElementById('cpmResult').textContent = formatCurrency(cpm);
    document.getElementById('roasResult').textContent = roas.toFixed(1) + 'x';

    // Set card state based on ROAS
    const roasCard = document.getElementById('roasCard');
    roasCard.classList.remove('good', 'bad', 'warning');

    if (roas >= 5) {
        roasCard.classList.add('good');
        document.getElementById('roasVerdict').textContent = '✅ Great deal! ROAS is 5x or higher';
    } else if (roas >= 3) {
        roasCard.classList.add('warning');
        document.getElementById('roasVerdict').textContent = '⚠️ Okay deal, but below 5x target';
    } else {
        roasCard.classList.add('bad');
        document.getElementById('roasVerdict').textContent = '❌ Poor ROAS - consider renegotiating';
    }

    document.getElementById('results').classList.add('hidden');
    document.getElementById('maxBudgetResults').classList.add('hidden');
    document.getElementById('roasResults').classList.remove('hidden');
}

// ROAS Calculator - Reverse Mode (Max Budget)
function calculateMaxBudget() {
    const avgViews = parseFloat(document.getElementById('reverseAvgViews').value) || 0;
    const integrationVideos = parseInt(document.getElementById('reverseIntegrationVideos').value) || 0;
    const fullVideos = parseInt(document.getElementById('reverseFullVideos').value) || 0;

    const errorDiv = document.getElementById('error');

    if (avgViews <= 0) {
        errorDiv.textContent = 'Please enter average views.';
        errorDiv.classList.remove('hidden');
        return;
    }

    errorDiv.classList.add('hidden');

    // Calculate expected sales based on video type
    let integrationSales = 0;
    let fullVideoSales = 0;

    if (selectedCalcVideoType === 'shorts') {
        // Shorts: Only full video sales using SHORTS_SPV
        fullVideoSales = avgViews * SHORTS_SPV * fullVideos;
    } else {
        // Long Videos: Both integration and full video sales
        integrationSales = avgViews * INTEGRATION_SPV * integrationVideos;
        fullVideoSales = avgViews * FULL_VIDEO_SPV * fullVideos;
    }
    const totalSales = integrationSales + fullVideoSales;

    // Calculate max budget for 5x ROAS
    // ROAS = totalSales / (quote + commission)
    // For 5x ROAS: 5 = totalSales / (quote + commission)
    // quote + commission = totalSales / 5
    // If commission = 5% of sales: quote + (totalSales * 0.05) = totalSales / 5
    // quote = (totalSales / 5) - (totalSales * 0.05)

    let maxBudget;
    if (hasReverseCommission) {
        // With 5% commission: quote = totalSales/5 - totalSales*0.05
        maxBudget = (totalSales / TARGET_ROAS) - (totalSales * 0.05);
    } else {
        // Without commission: quote = totalSales/5
        maxBudget = totalSales / TARGET_ROAS;
    }

    // Update UI
    document.getElementById('reverseIntegrationSales').textContent = formatCurrency(integrationSales);
    document.getElementById('reverseFullVideoSales').textContent = formatCurrency(fullVideoSales);
    document.getElementById('reverseTotalSales').textContent = formatCurrency(totalSales);
    document.getElementById('maxBudgetResult').textContent = formatCurrency(maxBudget);

    const subtitle = hasReverseCommission
        ? 'Max quote with 5% commission for 5x ROAS'
        : 'Max quote without commission for 5x ROAS';
    document.getElementById('maxBudgetSubtitle').textContent = subtitle;

    document.getElementById('results').classList.add('hidden');
    document.getElementById('roasResults').classList.add('hidden');
    document.getElementById('maxBudgetResults').classList.remove('hidden');
}

// Helper: Parse view count strings
function parseViewCount(str) {
    str = str.trim().replace(/,/g, '').replace(/views?/gi, '').trim();
    const match = str.match(/^([\d.]+)\s*([KkMmBb])?$/);
    if (!match) return null;

    let num = parseFloat(match[1]);
    const suffix = (match[2] || '').toUpperCase();

    if (suffix === 'K') num *= 1000;
    else if (suffix === 'M') num *= 1000000;
    else if (suffix === 'B') num *= 1000000000;

    return Math.round(num);
}

// Helper: Format view count
function formatViews(views) {
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
}

// Helper: Format currency
function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
