# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TatebayashiStones is a web-based map application for documenting stone monuments (石造物) in Tatebayashi City, Japan. It's an open data project that digitizes a 50-year-old survey of Buddhist statues and stone monuments, enabling community-based documentation and preservation.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Generate PWA assets (icons, splash screens)
npm run assets

# Convert GeoJSON to FlatGeobuf format for better performance
node fgb.mjs

# Add area information to GeoJSON features
node add_area_oaza.mjs
```

### Cloudflare Worker (Image Upload with Cloudflare Images)
```bash
cd worker
npm install

# Set up secrets (required before first deployment)
wrangler secret put AUTH_TOKEN
wrangler secret put CLOUDFLARE_IMAGES_API_TOKEN

# Local development
npm run dev

# Deploy to production
npm run deploy

# Test image upload locally
./test-upload.sh YOUR_AUTH_TOKEN path/to/image.jpg
```

## Architecture

### Frontend Application
- **index.html** + **src/main.js**: Main map interface using Leaflet.js
- **Geographic Data**: GeoJSON files converted to FlatGeobuf for performance
- **Image Storage**: Monument photos in `images/[id]/` directories
- **PWA Support**: Service worker (`sw.js`) for offline functionality

### Data Structure
Each monument has:
- Unique ID (numeric)
- Location (lat/lon coordinates)
- Type (石仏分類): jizo, koshin, bato, etc.
- Images linked by ID
- Historical information from original survey

### Image Processing Worker
- Handles uploads to Cloudflare Images
- Images stored with ID format: `PROJECT_PREFIX_UUID`
- Automatic variant generation via Cloudflare Images:
  - public: Original size
  - mid: 800x600 equivalent
  - small: 400x300 equivalent
- Authentication via Bearer token
- Returns URLs in format: `https://imagedelivery.net/ACCOUNT_HASH/IMAGE_ID/VARIANT`

### Key Data Files
- `tatebayashi_stones.geojson`: Main monument database
- `area.geojson`: Administrative boundaries
- `pois.geojson`: Points of interest
- `refs.geojson`: Reference landmarks

## Important Considerations

### Image Handling
- Legacy images are organized by monument ID in `images/[id]/`
- New images uploaded via Cloudflare Images with unique IDs
- Cloudflare Images automatically handles variants (no manual thumbnail generation)
- Original survey book scans and new photos coexist

### Data Updates
- New discoveries are added to the GeoJSON files
- Twitter integration allows crowdsourced condition reports
- Monument IDs above 1000 are post-survey additions

### Map Layers
- Uses Mapbox streets-v11 style
- OpenStreetMap as base layer
- GSI (国土地理院) aerial imagery option
- Custom icon system for monument types

### Localization
- UI is primarily in Japanese
- Monument data includes historical kanji
- Coordinates use JGD2011 / Japan Plane Rectangular CS IX

## Testing

When making changes to the map interface:
1. Check that monument popups display correctly
2. Verify image galleries load
3. Test PWA installation on mobile devices
4. Ensure Twitter sharing links work

When updating data:
1. Validate GeoJSON syntax
2. Regenerate FlatGeobuf file
3. Check that new monuments appear on map
4. Verify image paths match monument IDs