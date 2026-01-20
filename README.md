# Creator Collaboration Tool

A web application for calculating average video views and ROAS (Return on Ad Spend) for YouTuber and TikTok collaborations.

![Demo](https://img.shields.io/badge/Demo-Live-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

### 📺 YouTube Analytics
- Fetch average views automatically via YouTube Data API
- Separate **Long Videos** and **Shorts** tabs
- Filter by video age and count

### 🎵 TikTok Manual Entry
- Paste view counts in any format (1.2M, 850K, 125000)
- Instantly calculate average views

### 💰 ROAS Calculator
- **Manual Mode**: Check if a YouTuber's quote is profitable
- **Reverse Mode**: Find max budget for 5x ROAS target
- Color-coded results (Green = good, Red = renegotiate)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
http://localhost:3000
```

## 📊 ROAS Formulas

| Metric | Formula |
|--------|---------|
| Integration Sales | Avg Views × $0.03 × # Videos |
| Full Video Sales | Avg Views × $0.13 × # Videos |
| ROAS | Total Sales ÷ (Quote + Commission) |
| Max Budget (5x) | Total Sales ÷ 5 |

## 🛠️ Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **API**: YouTube Data API v3
- **Hosting**: Vercel

## 📝 License

MIT License - feel free to use and modify!

---

Built with ❤️ for creator marketing teams
