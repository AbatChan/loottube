<?php
/**
 * Comments API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/comments', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_comments',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('loottube/v1', '/comments', array(
        'methods' => 'POST',
        'callback' => 'loottube_create_comment',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/comments/(?P<id>[\\d]+)', array(
        'methods' => 'DELETE',
        'callback' => 'loottube_delete_comment',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_get_comments($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_comments';
    $meta_table = $wpdb->prefix . 'loottube_user_meta';

    $video_id = sanitize_text_field($request->get_param('videoId'));
    $video_type = sanitize_text_field($request->get_param('videoType')) ?: 'video';

    if (!$video_id) {
        return new WP_Error('missing_video_id', 'Video ID required', array('status' => 400));
    }

    $comments = $wpdb->get_results($wpdb->prepare(
        "SELECT c.*, u.channel_name as author, u.channel_handle as authorHandle, u.avatar as authorAvatar
        FROM $table c
        LEFT JOIN $meta_table u ON c.user_id = u.user_id
        WHERE c.video_id = %s AND c.video_type = %s AND c.parent_id IS NULL
        ORDER BY c.created_at DESC",
        $video_id, $video_type
    ));

    // Get replies for each comment
    foreach ($comments as &$comment) {
        $replies = $wpdb->get_results($wpdb->prepare(
            "SELECT c.*, u.channel_name as author, u.channel_handle as authorHandle, u.avatar as authorAvatar
            FROM $table c
            LEFT JOIN $meta_table u ON c.user_id = u.user_id
            WHERE c.parent_id = %d
            ORDER BY c.created_at ASC",
            $comment->id
        ));
        $comment->replies = $replies ?: array();
    }

    return rest_ensure_response($comments);
}

function loottube_create_comment($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_comments';
    $user_id = get_current_user_id();

    $data = array(
        'user_id' => $user_id,
        'video_id' => sanitize_text_field($request->get_param('videoId')),
        'video_type' => sanitize_text_field($request->get_param('videoType')) ?: 'video',
        'content' => sanitize_textarea_field($request->get_param('content')),
        'parent_id' => $request->has_param('parentId') ? intval($request->get_param('parentId')) : null
    );

    $wpdb->insert($table, $data);

    return rest_ensure_response(array(
        'success' => true,
        'id' => $wpdb->insert_id
    ));
}

function loottube_delete_comment($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_comments';
    $user_id = get_current_user_id();
    $id = intval($request->get_param('id'));

    // Check ownership
    $comment = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $id));
    if (!$comment || $comment->user_id != $user_id) {
        return new WP_Error('forbidden', 'Not authorized', array('status' => 403));
    }

    // Delete comment and its replies
    $wpdb->delete($table, array('id' => $id));
    $wpdb->delete($table, array('parent_id' => $id));

    return rest_ensure_response(array('success' => true));
}
