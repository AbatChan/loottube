<?php
/**
 * Playlists API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/playlists', array(
        array(
            'methods' => 'GET',
            'callback' => 'loottube_get_playlists',
            'permission_callback' => '__return_true'
        ),
        array(
            'methods' => 'POST',
            'callback' => 'loottube_create_playlist',
            'permission_callback' => 'is_user_logged_in'
        )
    ));

    register_rest_route('loottube/v1', '/playlists/(?P<id>[\\d]+)', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_playlist',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('loottube/v1', '/playlists/(?P<id>[\\d]+)/add-videos', array(
        'methods' => 'POST',
        'callback' => 'loottube_add_videos_to_playlist',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/playlists/(?P<id>[\\d]+)/remove-videos', array(
        'methods' => 'POST',
        'callback' => 'loottube_remove_videos_from_playlist',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_get_playlists($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_playlists';
    $items_table = $wpdb->prefix . 'loottube_playlist_items';
    $user_id = intval($request->get_param('userId'));

    if (!$user_id) {
        return new WP_Error('missing_user', 'User ID required', array('status' => 400));
    }

    $playlists = $wpdb->get_results($wpdb->prepare(
        "SELECT p.*, COUNT(pi.id) as video_count
        FROM $table p
        LEFT JOIN $items_table pi ON p.id = pi.playlist_id
        WHERE p.user_id = %d
        GROUP BY p.id
        ORDER BY p.created_at DESC",
        $user_id
    ));

    // Format response
    foreach ($playlists as &$playlist) {
        $video_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT video_id FROM $items_table WHERE playlist_id = %d ORDER BY position",
            $playlist->id
        ));
        $playlist->videoIds = $video_ids;
    }

    return rest_ensure_response($playlists);
}

function loottube_get_playlist($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_playlists';
    $items_table = $wpdb->prefix . 'loottube_playlist_items';
    $id = intval($request->get_param('id'));

    $playlist = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $id));

    if (!$playlist) {
        return new WP_Error('not_found', 'Playlist not found', array('status' => 404));
    }

    $video_ids = $wpdb->get_col($wpdb->prepare(
        "SELECT video_id FROM $items_table WHERE playlist_id = %d ORDER BY position",
        $id
    ));
    $playlist->videoIds = $video_ids;

    return rest_ensure_response($playlist);
}

function loottube_create_playlist($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_playlists';
    $user_id = intval($request->get_param('userId')) ?: get_current_user_id();

    $data = array(
        'user_id' => $user_id,
        'title' => sanitize_text_field($request->get_param('title')),
        'description' => sanitize_textarea_field($request->get_param('description')),
        'visibility' => sanitize_text_field($request->get_param('visibility')) ?: 'private'
    );

    $wpdb->insert($table, $data);

    return rest_ensure_response(array(
        'success' => true,
        'id' => $wpdb->insert_id,
        'title' => $data['title'],
        'videoIds' => array()
    ));
}

function loottube_add_videos_to_playlist($request) {
    global $wpdb;
    $items_table = $wpdb->prefix . 'loottube_playlist_items';
    $playlists_table = $wpdb->prefix . 'loottube_playlists';

    $playlist_id = intval($request->get_param('id'));
    $video_ids = $request->get_param('videoIds');
    $user_id = intval($request->get_param('userId')) ?: get_current_user_id();

    // Verify ownership
    $playlist = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $playlists_table WHERE id = %d AND user_id = %d",
        $playlist_id, $user_id
    ));

    if (!$playlist) {
        return new WP_Error('forbidden', 'Not authorized', array('status' => 403));
    }

    $position = $wpdb->get_var($wpdb->prepare(
        "SELECT MAX(position) FROM $items_table WHERE playlist_id = %d",
        $playlist_id
    )) ?: 0;

    foreach ((array)$video_ids as $video_id) {
        $position++;
        $wpdb->insert($items_table, array(
            'playlist_id' => $playlist_id,
            'video_id' => sanitize_text_field($video_id),
            'position' => $position
        ));
    }

    return rest_ensure_response(array('success' => true));
}

function loottube_remove_videos_from_playlist($request) {
    global $wpdb;
    $items_table = $wpdb->prefix . 'loottube_playlist_items';
    $playlist_id = intval($request->get_param('id'));
    $video_ids = $request->get_param('videoIds');

    foreach ((array)$video_ids as $video_id) {
        $wpdb->delete($items_table, array(
            'playlist_id' => $playlist_id,
            'video_id' => sanitize_text_field($video_id)
        ));
    }

    return rest_ensure_response(array('success' => true));
}
