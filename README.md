# 2026 Frontend Challenge - Ankara

A React-based web application for tracking records and suspects with an interactive map view. Built with React, Vite, and Leaflet for mapping capabilities.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone or Download the Repository

```bash
git clone https://github.com/cemjotform/2026-frontend-challenge-ankara.git
cd 2026-frontend-challenge-ankara
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

Navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 4. Start the Development Server

While in the `frontend` directory, run:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another available port if 5173 is busy).

---

## 💻 Platform-Specific Setup Instructions

### Windows

#### Using Command Prompt or PowerShell:

```bash
# 1. Navigate to the project folder
cd path\to\2026-frontend-challenge-ankara

# 2. Install dependencies
npm install

# 3. Navigate to frontend
cd frontend

# 4. Install frontend dependencies
npm install

# 5. Start development server
npm run dev
```

**Troubleshooting on Windows:**
- If you get a permission error, try running Command Prompt or PowerShell as Administrator
- If port 5173 is in use, Vite will automatically use the next available port
- Clear npm cache if you encounter installation issues: `npm cache clean --force`

---

### macOS

#### Using Terminal:

```bash
# 1. Navigate to the project folder
cd path/to/2026-frontend-challenge-ankara

# 2. Install dependencies
npm install

# 3. Navigate to frontend
cd frontend

# 4. Install frontend dependencies
npm install

# 5. Start development server
npm run dev
```

**Troubleshooting on macOS:**
- If you encounter permission issues, you may need to use `sudo`, but it's not recommended
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- If npm is not found, ensure Node.js was installed correctly

---

### Linux (Ubuntu/Debian)

#### Using Terminal:

```bash
# 1. Navigate to the project folder
cd path/to/2026-frontend-challenge-ankara

# 2. Install dependencies
npm install

# 3. Navigate to frontend
cd frontend

# 4. Install frontend dependencies
npm install

# 5. Start development server
npm run dev
```

**Troubleshooting on Linux:**
- Install Node.js using your package manager if not already installed:
  ```bash
  sudo apt update
  sudo apt install nodejs npm
  ```
- If you encounter permission issues with npm, consider using nvm (Node Version Manager) for better Node.js management

---

## 📦 Available Scripts

In the `frontend` directory, you can run:

### `npm run dev`
Starts the development server with hot module reloading. The app will automatically reload when you make changes.

### `npm run build`
Creates an optimized production build in the `dist` folder.

### `npm run preview`
Previews the production build locally.

### `npm run lint`
Runs ESLint to check code quality and style.

---

## 🗺️ Features

- **Record Tracking**: View and filter records by type (Check-in, Message, Sighting, Note, Tip)
- **Suspect Analysis**: Ranked suspect list with score calculations and known associates detection
- **Known Associates**: Automatically identifies and displays people connected to each suspect based on evidence
- **Interactive Map**: Leaflet-based map showing record locations with custom markers, dark mode support
- **Dark Mode**: Toggle between light and dark themes with persistent preference (saved to localStorage)
- **Timeline View**: Chronological display of events and activities
- **Search & Filter**: Filter records by various criteria
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

---

## 💡 How to Use

### Viewing Records & Timeline
1. Use the **Search & Filter** panel on the left to find specific records
2. Filter by type (Check-in, Message, Sighting, etc.) or search by location/people
3. Click on any record in the timeline to view details on the right panel

### Analyzing Suspects
1. Click on any suspect in the **Suspicion Ranking** panel (left sidebar)
2. View their stats: Score, Tips, Sightings, Messages
3. See their **Known Associates** - automatically detected people they were seen with
4. Review their **Evidence Trail** showing all connected records

### Using the Map
1. Records are plotted on the interactive map with color-coded markers
2. Use the **+/- zoom buttons** (top-left) to zoom in/out
3. Drag to pan around the map
4. Click any marker to view record details
5. Map automatically switches to dark variant in dark mode

### Dark Mode
1. Click the **🌙 Dark** or **☀️ Light** button in the top-right header
2. Your preference is automatically saved for next time
3. All UI elements and map adapt to the selected theme

---

## 🛠️ Tech Stack

- **React** (^19.2.4) - UI library
- **Vite** (^8.0.4) - Build tool and dev server
- **Leaflet** (^1.9.4) - Mapping library
- **React-Leaflet** (^5.0.0) - React bindings for Leaflet
- **ESLint** - Code linting

---

## 📁 Project Structure

```
2026-frontend-challenge-ankara/
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main app component
│   │   ├── App.css           # App styles
│   │   ├── MapView.jsx       # Map component
│   │   ├── api.js            # API calls and data fetching
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Global styles
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
├── deneme.py                 # Python utility file
└── README.md                 # This file
```

---

## 🐛 Troubleshooting

### Blank page in browser?
- Check the browser console (F12 or Right-click → Inspect → Console) for errors
- Ensure all dependencies are installed: `npm install` in both root and `frontend` directories
- Clear your browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Port already in use?
Vite will automatically use the next available port. You can also specify a custom port:
```bash
npm run dev -- --port 3000
```

### Module not found errors?
Run `npm install` again to ensure all dependencies are properly installed.

### Map not showing?
Ensure `react-leaflet` and `leaflet` are installed. If missing, run:
```bash
npm install leaflet react-leaflet
```

---

## 📝 License

This project is part of the JotForm Frontend Challenge.

## 🎯 Original Challenge Info

- **Repository**: https://github.com/cemjotform/2026-frontend-challenge-ankara
- **Challenge Duration**: 3 hours
- **Framework**: React (with Vite build tool)

---

## 🤝 Contributing

When contributing or sharing your setup:
1. Fork the repository
2. Create your feature branch
3. Test your changes thoroughly on your development machine
4. Commit with clear messages
5. Push to your fork

---

## ❓ Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Check the browser console for error messages
3. Verify Node.js version: `node --version` (should be v16+)
4. Verify npm version: `npm --version`
5. Try clearing node_modules and reinstalling:
   ```bash
   rm -r node_modules package-lock.json  # macOS/Linux
   # Or for Windows: del /s /q node_modules && del package-lock.json
   npm install
   ```
