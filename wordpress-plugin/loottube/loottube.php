<?php
/**
 * Plugin Name: Loottube
 * Plugin URI: https://loottube.com
 * Description: A modern video sharing platform with support for videos, shorts, playlists, comments, and notifications. Provides REST API backend for the Next.js frontend.
 * Version: 1.0.0
 * Author: Loottube Team
 * Author URI: https://loottube.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: loottube
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('LOOTTUBE_VERSION', '1.0.0');
define('LOOTTUBE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('LOOTTUBE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('LOOTTUBE_PLUGIN_FILE', __FILE__);

/**
 * Main Loottube Class
 */
class Loottube {
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_hooks();
    }

    private function init_hooks() {
        register_activation_hook(LOOTTUBE_PLUGIN_FILE, array($this, 'activate'));
        register_deactivation_hook(LOOTTUBE_PLUGIN_FILE, array($this, 'deactivate'));

        add_action('init', array($this, 'init'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
    }

    public function activate() {
        $this->create_tables();
        flush_rewrite_rules();
    }

    public function deactivate() {
        flush_rewrite_rules();
    }

    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('loottube', false, dirname(plugin_basename(__FILE__)) . '/languages');

        // Register custom post types and taxonomies
        $this->register_post_types();
    }

    /**
     * Create custom database tables
     */
    private function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        // Videos table
        $table_videos = $wpdb->prefix . 'loottube_videos';
        $sql_videos = "CREATE TABLE $table_videos (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            file_path varchar(500),
            thumbnail varchar(500),
            duration int(11),
            views bigint(20) DEFAULT 0,
            likes bigint(20) DEFAULT 0,
            dislikes bigint(20) DEFAULT 0,
            visibility varchar(20) DEFAULT 'public',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY visibility (visibility),
            KEY created_at (created_at)
        ) $charset_collate;";

        // Shorts table
        $table_shorts = $wpdb->prefix . 'loottube_shorts';
        $sql_shorts = "CREATE TABLE $table_shorts (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            file_path varchar(500),
            thumbnail varchar(500),
            views bigint(20) DEFAULT 0,
            likes bigint(20) DEFAULT 0,
            dislikes bigint(20) DEFAULT 0,
            comment_count int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY created_at (created_at)
        ) $charset_collate;";

        // Playlists table
        $table_playlists = $wpdb->prefix . 'loottube_playlists';
        $sql_playlists = "CREATE TABLE $table_playlists (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            visibility varchar(20) DEFAULT 'private',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id)
        ) $charset_collate;";

        // Playlist items table
        $table_playlist_items = $wpdb->prefix . 'loottube_playlist_items';
        $sql_playlist_items = "CREATE TABLE $table_playlist_items (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            playlist_id bigint(20) UNSIGNED NOT NULL,
            video_id varchar(100) NOT NULL,
            position int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY playlist_id (playlist_id),
            KEY video_id (video_id)
        ) $charset_collate;";

        // Comments table
        $table_comments = $wpdb->prefix . 'loottube_comments';
        $sql_comments = "CREATE TABLE $table_comments (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            video_id varchar(100) NOT NULL,
            video_type varchar(20) DEFAULT 'video',
            user_id bigint(20) UNSIGNED NOT NULL,
            parent_id bigint(20) UNSIGNED DEFAULT NULL,
            content text NOT NULL,
            likes int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY video_id (video_id),
            KEY user_id (user_id),
            KEY parent_id (parent_id)
        ) $charset_collate;";

        // Notifications table
        $table_notifications = $wpdb->prefix . 'loottube_notifications';
        $sql_notifications = "CREATE TABLE $table_notifications (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            type varchar(50),
            is_read tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY is_read (is_read)
        ) $charset_collate;";

        // Subscriptions table
        $table_subscriptions = $wpdb->prefix . 'loottube_subscriptions';
        $sql_subscriptions = "CREATE TABLE $table_subscriptions (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            subscriber_id bigint(20) UNSIGNED NOT NULL,
            channel_id varchar(100) NOT NULL,
            channel_name varchar(255),
            channel_handle varchar(255),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_subscription (subscriber_id, channel_id),
            KEY subscriber_id (subscriber_id)
        ) $charset_collate;";

        // Video reactions table
        $table_reactions = $wpdb->prefix . 'loottube_video_reactions';
        $sql_reactions = "CREATE TABLE $table_reactions (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            video_id varchar(100) NOT NULL,
            reaction_type varchar(20) NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_reaction (user_id, video_id),
            KEY user_id (user_id),
            KEY video_id (video_id)
        ) $charset_collate;";

        // User meta table for additional profile data
        $table_user_meta = $wpdb->prefix . 'loottube_user_meta';
        $sql_user_meta = "CREATE TABLE $table_user_meta (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id bigint(20) UNSIGNED NOT NULL,
            channel_name varchar(255),
            channel_handle varchar(255),
            avatar varchar(500),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY user_id (user_id)
        ) $charset_collate;";

        dbDelta($sql_videos);
        dbDelta($sql_shorts);
        dbDelta($sql_playlists);
        dbDelta($sql_playlist_items);
        dbDelta($sql_comments);
        dbDelta($sql_notifications);
        dbDelta($sql_subscriptions);
        dbDelta($sql_reactions);
        dbDelta($sql_user_meta);

        update_option('loottube_db_version', LOOTTUBE_VERSION);
    }

    /**
     * Register custom post types
     */
    private function register_post_types() {
        // You can optionally register post types if needed
        // For now, using custom tables for better performance
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        // Include API route files
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/videos.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/shorts.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/playlists.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/comments.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/notifications.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/subscriptions.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/users.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/auth.php';
        require_once LOOTTUBE_PLUGIN_DIR . 'includes/api/upload.php';
    }
}

// Initialize the plugin
function loottube() {
    return Loottube::get_instance();
}

// Start the plugin
loottube();
