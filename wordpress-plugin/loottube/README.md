# Loottube WordPress Plugin

A WordPress backend plugin for the Loottube video sharing platform. This plugin provides REST API endpoints to store all data in WordPress database while keeping the Next.js frontend intact.

## Features

- **Custom Database Tables** for videos, shorts, playlists, comments, notifications, subscriptions
- **RESTful API** endpoints compatible with the existing Next.js frontend
- **User Management** with custom profile fields (channel name, handle, avatar)
- **File Upload** support for videos and images
- **Secure Authentication** using WordPress's built-in auth system
- **Production-Ready** database schema with proper indexing

## Installation

### 1. Install the WordPress Plugin

1. Copy the `loottube` folder to your WordPress `wp-content/plugins/` directory
2. Go to WordPress Admin → Plugins
3. Activate "Loottube"
4. The plugin will automatically create all necessary database tables

### 2. Configure Your Next.js Frontend

Update your Next.js environment variables to point to the WordPress API:

```env
# .env.local
NEXT_PUBLIC_API_URL=https://your-wordpress-site.com/wp-json/loottube/v1
```

### 3. Enable WordPress REST API CORS

Add this to your WordPress theme's `functions.php` or create a custom plugin:

```php
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        return $value;
    });
}, 15);
```

## Database Schema

### Tables Created

- `wp_loottube_videos` - Video content
- `wp_loottube_shorts` - Short-form videos
- `wp_loottube_playlists` - User playlists
- `wp_loottube_playlist_items` - Playlist contents
- `wp_loottube_comments` - Video/shorts comments with replies
- `wp_loottube_notifications` - User notifications
- `wp_loottube_subscriptions` - Channel subscriptions
- `wp_loottube_video_reactions` - Likes/dislikes
- `wp_loottube_user_meta` - Extended user profile data

## API Endpoints

### Authentication

- `POST /wp-json/loottube/v1/auth/signup` - Create new user
- `POST /wp-json/loottube/v1/auth/signin` - Sign in
- `POST /wp-json/loottube/v1/auth/signout` - Sign out
- `GET /wp-json/loottube/v1/auth/me` - Get current user
- `PUT /wp-json/loottube/v1/auth/profile` - Update profile

### Videos

- `GET /wp-json/loottube/v1/videos` - List videos
- `GET /wp-json/loottube/v1/videos/{id}` - Get single video
- `POST /wp-json/loottube/v1/videos` - Create video
- `PUT /wp-json/loottube/v1/videos/{id}` - Update video
- `DELETE /wp-json/loottube/v1/videos/{id}` - Delete video
- `POST /wp-json/loottube/v1/videos/{id}/view` - Increment view count
- `POST /wp-json/loottube/v1/videos/{id}/like` - Like/unlike video

### Shorts

- `GET /wp-json/loottube/v1/shorts` - List shorts
- `GET /wp-json/loottube/v1/shorts/{id}` - Get single short
- `POST /wp-json/loottube/v1/shorts` - Create short
- `POST /wp-json/loottube/v1/shorts/{id}/metrics` - Update metrics (views, likes, etc.)

### Playlists

- `GET /wp-json/loottube/v1/playlists?userId={id}` - Get user playlists
- `GET /wp-json/loottube/v1/playlists/{id}` - Get playlist
- `POST /wp-json/loottube/v1/playlists` - Create playlist
- `POST /wp-json/loottube/v1/playlists/{id}/add-videos` - Add videos to playlist
- `POST /wp-json/loottube/v1/playlists/{id}/remove-videos` - Remove videos from playlist

### Comments

- `GET /wp-json/loottube/v1/comments?videoId={id}&videoType=video` - Get comments
- `POST /wp-json/loottube/v1/comments` - Create comment/reply
- `DELETE /wp-json/loottube/v1/comments/{id}` - Delete comment

### Notifications

- `GET /wp-json/loottube/v1/notifications` - Get user notifications
- `POST /wp-json/loottube/v1/notifications` - Create notification
- `POST /wp-json/loottube/v1/notifications/{id}/read` - Mark as read
- `POST /wp-json/loottube/v1/notifications/mark-all-read` - Mark all as read
- `DELETE /wp-json/loottube/v1/notifications/{id}` - Delete notification

### Subscriptions

- `GET /wp-json/loottube/v1/subscriptions` - Get user subscriptions
- `POST /wp-json/loottube/v1/subscriptions/toggle` - Subscribe/unsubscribe

### Users

- `GET /wp-json/loottube/v1/users/{handle}` - Get user by handle
- `GET /wp-json/loottube/v1/users/{id}/videos` - Get user videos
- `GET /wp-json/loottube/v1/users/{id}/shorts` - Get user shorts

### Upload

- `POST /wp-json/loottube/v1/upload` - Upload file

## Frontend Integration

### Update API Calls

Replace localStorage-based functions with API calls. Example:

**Before (localStorage):**
```typescript
export function getCurrentUser() {
  const stored = localStorage.getItem('lootube_current_user')
  return stored ? JSON.parse(stored) : null
}
```

**After (WordPress API):**
```typescript
export async function getCurrentUser() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    credentials: 'include'
  })
  if (!response.ok) return null
  return await response.json()
}
```

### Authentication Flow

The plugin uses WordPress cookies for authentication. Set `credentials: 'include'` in all fetch requests:

```typescript
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify(data)
})
```

## Development

### Testing the API

Use tools like Postman or curl:

```bash
# Sign up
curl -X POST https://your-site.com/wp-json/loottube/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","channelName":"Test Channel"}'

# Get videos
curl https://your-site.com/wp-json/loottube/v1/videos
```

### Debugging

Enable WordPress debug mode in `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Check logs at `wp-content/debug.log`

## Security Notes

1. **HTTPS Required** - Always use HTTPS in production
2. **CORS Configuration** - Restrict to your frontend domain only
3. **File Upload Limits** - Configure in `php.ini` or WordPress settings
4. **Rate Limiting** - Consider adding rate limiting for production

## Production Checklist

- [ ] Install and activate plugin on WordPress
- [ ] Configure CORS for your frontend domain
- [ ] Set up HTTPS/SSL
- [ ] Increase PHP upload limits for video files
- [ ] Configure WordPress permalinks (Pretty URLs)
- [ ] Test all API endpoints
- [ ] Update frontend API URL in environment variables
- [ ] Enable WordPress caching (Redis/Memcached recommended)
- [ ] Set up database backups
- [ ] Configure CDN for video files

## Troubleshooting

### 404 Errors on API Endpoints

1. Go to WordPress Admin → Settings → Permalinks
2. Click "Save Changes" to flush rewrite rules

### CORS Errors

Add the CORS configuration shown above to your WordPress installation

### File Upload Errors

Increase PHP limits in `php.ini`:
```ini
upload_max_filesize = 500M
post_max_size = 500M
max_execution_time = 300
```

## Support

For issues and questions, please check the documentation or create an issue in the project repository.

## License

GPL v2 or later
