# 📸 Enhanced Photo Viewer - Feature Documentation

## Overview

The Jacxi Shipping dashboard now includes a **professional-grade photo viewer** with advanced features for viewing, zooming, and downloading shipment photos (container and arrival photos).

---

## ✨ Key Features

### 1. **Beautiful Lightbox Gallery**
- Full-screen immersive viewing experience
- Dark backdrop with blur effect for focus
- Smooth animations and transitions
- Professional UI with gradient overlays

### 2. **Photo Navigation**
- **Next/Previous Buttons**: Navigate through multiple photos
- **Keyboard Controls**: 
  - `Arrow Left/Right`: Navigate between photos
  - `Escape`: Close the viewer
- **Thumbnail Strip**: Quick navigation with visual preview
- Active thumbnail highlighted with cyan border
- Smooth scroll for many photos

### 3. **Zoom Controls**
- **Zoom In/Out Buttons**: Control image zoom level
- Zoom range: 50% to 300%
- Real-time zoom percentage display
- Smooth zoom animations
- Auto-reset zoom when navigating between photos

### 4. **Download Options**
- **Download Current Photo**: Download the photo you're viewing
- **Download All Photos**: Download entire photo collection as ZIP
- Download count indicator for multiple photos
- Automatic filename generation
- Loading state during download

### 5. **Responsive Design**
- Mobile-optimized controls
- Touch-friendly buttons
- Adaptive layout for all screen sizes
- Smooth gestures on mobile devices

### 6. **User Experience**
- Click anywhere outside the photo to close
- Hover effects on all interactive elements
- Disabled states for zoom limits
- Visual feedback for all actions
- Professional color scheme (cyan accents)

---

## 🎨 Design Highlights

### Header Bar
```
┌─────────────────────────────────────────────────┐
│ Container Photos            Photo 1 of 5    [X] │
└─────────────────────────────────────────────────┘
```
- Photo collection title
- Current photo indicator
- Close button

### Main Viewing Area
- Large, centered photo display
- Black background for contrast
- Smooth zoom with motion
- 16:9 aspect ratio (adaptable)

### Bottom Control Bar
```
┌─────────────────────────────────────────────────┐
│ [-] 100% [+]           [All (5)] [Current]     │
│ ◼ ◼ ◼ ◻ ◻                                       │
└─────────────────────────────────────────────────┘
```
- Zoom controls with percentage
- Download buttons
- Thumbnail navigation strip

---

## 🔧 Technical Implementation

### Technologies Used
- **React**: Component-based UI
- **Framer Motion**: Smooth animations
- **Next.js Image**: Optimized image loading
- **Lucide Icons**: Professional iconography
- **Tailwind CSS**: Responsive styling

### Photo Download Flow

#### Single Photo Download
```
User clicks "Download Current"
    ↓
API: GET /api/photos/download?url=...
    ↓
Fetch photo from URL
    ↓
Return as downloadable file
    ↓
Browser downloads photo
```

#### Multiple Photos Download
```
User clicks "Download All"
    ↓
API: POST /api/photos/download
    ↓
Fetch all photos
    ↓
Create ZIP archive using JSZip
    ↓
Return ZIP file
    ↓
Browser downloads ZIP
```

### State Management
```typescript
const [lightbox, setLightbox] = useState<{
  images: string[];
  index: number;
  title: string;
} | null>(null);

const [zoomLevel, setZoomLevel] = useState(1);
const [downloading, setDownloading] = useState(false);
```

---

## 📱 Usage Examples

### Opening the Photo Viewer

**In Shipment Details Page:**
1. Navigate to any shipment
2. Scroll to "Container Photos" or "Arrival Photos"
3. Click any photo thumbnail
4. Lightbox opens with that photo

### Navigating Photos

**Using Buttons:**
- Click left/right arrows on sides

**Using Keyboard:**
- Press `←` (left arrow) for previous
- Press `→` (right arrow) for next
- Press `Esc` to close

**Using Thumbnails:**
- Click any thumbnail in the bottom strip
- Active photo is highlighted

### Zooming Photos

**Using Buttons:**
1. Click `[-]` to zoom out (min 50%)
2. Click `[+]` to zoom in (max 300%)
3. Percentage displayed in center

**Automatic Reset:**
- Zoom resets to 100% when changing photos

### Downloading Photos

**Single Photo:**
1. Open photo in viewer
2. Click "Download Current" button
3. Photo downloads with auto-generated name

**All Photos:**
1. Open any photo (if multiple exist)
2. Click "Download All (X)" button
3. All photos download as ZIP file

---

## 🎯 Where It's Used

### Dashboard Pages

1. **Shipment Details** (`/dashboard/shipments/[id]`)
   - Container Photos section
   - Arrival Photos section

2. **Shipment Edit** (`/dashboard/shipments/[id]/edit`)
   - Container Photos section
   - Arrival Photos section (with upload)

---

## 🚀 Future Enhancements

### Potential Improvements
- [ ] **Image Comparison**: Side-by-side photo comparison
- [ ] **Annotations**: Draw on photos, add notes
- [ ] **Filters**: Apply filters (brightness, contrast, etc.)
- [ ] **Rotation**: Rotate photos 90° increments
- [ ] **Fullscreen API**: Native fullscreen support
- [ ] **Share**: Share photos via link/email
- [ ] **Print**: Print selected photos
- [ ] **Slideshow**: Auto-play slideshow mode
- [ ] **Metadata**: Display EXIF data (date, camera, location)
- [ ] **Search**: Find specific photos by date/tag

### Performance Optimizations
- [ ] Lazy load thumbnails
- [ ] Preload next/previous photos
- [ ] Image caching
- [ ] Progressive image loading
- [ ] WebP format support

---

## 🔐 Security & Permissions

### Authentication
- Only authenticated users can view photos
- API routes protected with session checks

### Download Protection
- Photos fetched server-side
- Original URLs not exposed to client
- Rate limiting on download endpoint (recommended)

---

## 📊 API Endpoints

### GET `/api/photos/download`
Download a single photo.

**Query Parameters:**
- `url` (required): Photo URL to download

**Response:**
- File download (image/jpeg, image/png, etc.)

**Example:**
```bash
GET /api/photos/download?url=https://example.com/photo.jpg
```

### POST `/api/photos/download`
Download multiple photos as ZIP.

**Request Body:**
```json
{
  "photos": ["url1", "url2", "url3"],
  "filename": "shipment-ABC123-container-photos"
}
```

**Response:**
- ZIP file download

---

## 🎨 Styling Guide

### Color Scheme
- **Primary**: Cyan (`#06b6d4`)
- **Background**: Black with 95% opacity
- **Controls**: White with 10-20% opacity
- **Active State**: Cyan border + ring
- **Hover**: Slight opacity increase + scale

### Typography
- **Title**: 14px, uppercase, tracking-wider
- **Counter**: 18px, bold
- **Zoom**: 14px, medium
- **Buttons**: 14px, medium

### Spacing
- **Padding**: 16px (mobile), 24px (desktop)
- **Gap**: 8px (thumbnails), 16px (controls)
- **Border Radius**: 12px (large elements), 8px (small)

---

## 🐛 Troubleshooting

### Photos Not Loading
1. Check network connection
2. Verify photo URLs are accessible
3. Check browser console for errors
4. Ensure authentication is valid

### Download Fails
1. Check browser popup blocker
2. Verify sufficient disk space
3. Check API endpoint logs
4. Try downloading individual photos first

### Zoom Not Working
1. Ensure JavaScript is enabled
2. Check for browser compatibility
3. Try refreshing the page

### Thumbnails Not Scrolling
1. Check if scrollbar is visible
2. Try mouse wheel or trackpad
3. Use arrow buttons if available

---

## 📝 Code Examples

### Opening Lightbox Programmatically
```typescript
const openLightbox = (images: string[], index: number, title: string) => {
  if (!images.length) return;
  setLightbox({ images, index, title });
  setZoomLevel(1);
};

// Usage
openLightbox(
  shipment.containerPhotos, 
  0, 
  'Container Photos'
);
```

### Download Single Photo
```typescript
const downloadPhoto = async (url: string, filename: string) => {
  setDownloading(true);
  const response = await fetch(
    `/api/photos/download?url=${encodeURIComponent(url)}`
  );
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.click();
  setDownloading(false);
};
```

### Download All Photos as ZIP
```typescript
const downloadAllPhotos = async (images: string[], title: string) => {
  setDownloading(true);
  const response = await fetch('/api/photos/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      photos: images,
      filename: `${title}-${trackingNumber}`
    }),
  });
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${title}.zip`;
  link.click();
  setDownloading(false);
};
```

---

## 🎓 Best Practices

### For Users
1. **Preview before download**: View photos first to ensure quality
2. **Download selectively**: Download only needed photos to save bandwidth
3. **Use ZIP for bulk**: Download all photos at once if you need multiple
4. **Check zoom**: Use zoom to inspect photo details

### For Developers
1. **Optimize images**: Compress photos before upload
2. **Lazy load**: Load thumbnails on-demand
3. **Error handling**: Gracefully handle missing/broken images
4. **Accessibility**: Add proper ARIA labels and keyboard support
5. **Performance**: Monitor download times and optimize

---

## 📞 Support

For issues or feature requests:
1. Check this documentation
2. Review console logs for errors
3. Contact system administrator
4. Report bugs via issue tracker

---

**Last Updated**: November 18, 2025  
**Version**: 1.0.0  
**Author**: Jacxi Shipping Development Team

