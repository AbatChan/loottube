<?php
/**
 * Videos API endpoints
 */

add_action('rest_api_init', function() {
    // Get videos
    register_rest_route('loottube/v1', '/videos', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_videos',
        'permission_callback' => '__return_true'
    ));

    // Get single video
    register_rest_route('loottube/v1', '/videos/(?P<id>[\\d]+)', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_video',
        'permission_callback' => '__return_true'
    ));

    // Create video
    register_rest_route('loottube/v1', '/videos', array(
        'methods' => 'POST',
        'callback' => 'loottube_create_video',
        'permission_callback' => 'is_user_logged_in'
    ));

    // Update video
    register_rest_route('loottube/v1', '/videos/(?P<id>[\\d]+)', array(
        'methods' => 'PUT',
        'callback' => 'loottube_update_video',
        'permission_callback' => 'is_user_logged_in'
    ));

    // Delete video
    register_rest_route('loottube/v1', '/videos/(?P<id>[\\d]+)', array(
        'methods' => 'DELETE',
        'callback' => 'loottube_delete_video',
        'permission_callback' => 'is_user_logged_in'
    ));

    // Increment view
    register_rest_route('loottube/v1', '/videos/(?P<id>[\\d]+)/view', array(
        'methods' => 'POST',
        'callback' => 'loottube_increment_video_view',
        'permission_callback' => '__return_true'
    ));

    // Like/Unlike video
    register_rest_route('loottube/v1', '/videos/(?P<id>[\\d]+)/like', array(
        'methods' => 'POST',
        'callback' => 'loottube_toggle_video_like',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_get_videos($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_videos';
    $meta_table = $wpdb->prefix . 'loottube_user_meta';

    $limit = intval($request->get_param('limit')) ?: 20;
    $offset = intval($request->get_param('offset')) ?: 0;
    $user_id = intval($request->get_param('userId'));

    $where = "v.visibility = 'public'";
    if ($user_id) {
        $where = "v.user_id = $user_id";
    }

    $videos = $wpdb->get_results($wpdb->prepare(
        "SELECT v.*, u.channel_name, u.channel_handle, u.avatar
        FROM $table v
        LEFT JOIN $meta_table u ON v.user_id = u.user_id
        WHERE $where
        ORDER BY v.created_at DESC
        LIMIT %d OFFSET %d",
        $limit, $offset
    ));

    return rest_ensure_response($videos);
}

function loottube_get_video($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_videos';
    $meta_table = $wpdb->prefix . 'loottube_user_meta';

    $id = intval($request->get_param('id'));

    $video = $wpdb->get_row($wpdb->prepare(
        "SELECT v.*, u.channel_name, u.channel_handle, u.avatar
        FROM $table v
        LEFT JOIN $meta_table u ON v.user_id = u.user_id
        WHERE v.id = %d",
        $id
    ));

    if (!$video) {
        return new WP_Error('not_found', 'Video not found', array('status' => 404));
    }

    return rest_ensure_response($video);
}

function loottube_create_video($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_videos';
    $user_id = get_current_user_id();

    $data = array(
        'user_id' => $user_id,
        'title' => sanitize_text_field($request->get_param('title')),
        'description' => sanitize_textarea_field($request->get_param('description')),
        'file_path' => esc_url_raw($request->get_param('filePath')),
        'thumbnail' => esc_url_raw($request->get_param('thumbnail')),
        'duration' => intval($request->get_param('duration')),
        'visibility' => sanitize_text_field($request->get_param('visibility')) ?: 'public'
    );

    $wpdb->insert($table, $data);
    $video_id = $wpdb->insert_id;

    return rest_ensure_response(array(
        'success' => true,
        'id' => $video_id
    ));
}

function loottube_update_video($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_videos';
    $user_id = get_current_user_id();
    $id = intval($request->get_param('id'));

    // Check ownership
    $video = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $id));
    if (!$video || $video->user_id != $user_id) {
        return new WP_Error('forbidden', 'Not authorized', array('status' => 403));
    }

    $data = array();
    if ($request->has_param('title')) {
        $data['title'] = sanitize_text_field($request->get_param('title'));
    }
    if ($request->has_param('description')) {
        $data['description'] = sanitize_textarea_field($request->get_param('description'));
    }
    if ($request->has_param('visibility')) {
        $data['visibility'] = sanitize_text_field($request->get_param('visibility'));
    }

    if (!empty($data)) {
        $wpdb->update($table, $data, array('id' => $id));
    }

    return rest_ensure_response(array('success' => true));
}

function loottube_delete_video($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_videos';
    $user_id = get_current_user_id();
    $id = intval($request->get_param('id'));

    // Check ownership
    $video = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $id));
    if (!$video || $video->user_id != $user_id) {
        return new WP_Error('forbidden', 'Not authorized', array('status' => 403));
    }

    $wpdb->delete($table, array('id' => $id));

    return rest_ensure_response(array('success' => true));
}

function loottube_increment_video_view($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_videos';
    $id = intval($request->get_param('id'));

    $wpdb->query($wpdb->prepare(
        "UPDATE $table SET views = views + 1 WHERE id = %d",
        $id
    ));

    return rest_ensure_response(array('success' => true));
}

function loottube_toggle_video_like($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_video_reactions';
    $videos_table = $wpdb->prefix . 'loottube_videos';
    $user_id = get_current_user_id();
    $video_id = $request->get_param('id');
    $action = sanitize_text_field($request->get_param('action')); // 'like' or 'unlike'

    // Check existing reaction
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE user_id = %d AND video_id = %s",
        $user_id, $video_id
    ));

    if ($action === 'like') {
        if (!$existing) {
            $wpdb->insert($table, array(
                'user_id' => $user_id,
                'video_id' => $video_id,
                'reaction_type' => 'like'
            ));
            $wpdb->query($wpdb->prepare(
                "UPDATE $videos_table SET likes = likes + 1 WHERE id = %s",
                $video_id
            ));
        }
    } else if ($action === 'unlike') {
        if ($existing) {
            $wpdb->delete($table, array('user_id' => $user_id, 'video_id' => $video_id));
            $wpdb->query($wpdb->prepare(
                "UPDATE $videos_table SET likes = likes - 1 WHERE id = %s",
                $video_id
            ));
        }
    }

    return rest_ensure_response(array('success' => true));
}
