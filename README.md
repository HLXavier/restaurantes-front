# Food Review Frontend

A mobile-first static frontend for the Food Review application.

## Features

- 🍽️ **Restaurant List**: Browse all restaurants with scores and ratings
- ⭐ **Review System**: Submit reviews with half-point ratings (1-5 scale)
- 👤 **User Authentication**: Login/Register to submit reviews
- 📊 **Score System**:
  - 1.0-1.4: Gorfo Extremo 🤮
  - 1.5-2.4: Vei Podi 🫩
  - 2.5-3.4: Blé 😐
  - 3.5-4.4: Top 👏
  - 4.5-5.0: Perfect 🎖️
  - Highest Score: GOAT 🐐

## Running Locally

1. Make sure the backend is running on `http://localhost:3000`
2. Open `index.html` in a web browser
3. Or use a local server:
   ```bash
   # Python 3
   python -m http.server 8080
   
   # Node.js (using npx)
   npx serve .
   ```
4. Visit `http://localhost:8080` in your browser

## Review Categories

Each review has 6 categories with different weights:

- **Food Quality** (40%): Taste, freshness, presentation, portion size
- **Service** (20%): Friendliness, attentiveness, accuracy, efficiency
- **Atmosphere** (15%): Ambience, comfort, hygiene, features
- **Value for Money** (15%): Pricing vs quality/experience
- **Waiting Time** (5%): Speed of service
- **Location & Accessibility** (5%): Convenience, parking, access

## API Configuration

By default, the frontend connects to `http://localhost:3000`. To change this:

1. Edit `script.js`
2. Update the `API_URL` constant at the top of the file

## Mobile Optimized

This frontend is designed mobile-first with:
- Responsive cards
- Touch-friendly buttons
- Range sliders for ratings
- Modal dialogs for forms
