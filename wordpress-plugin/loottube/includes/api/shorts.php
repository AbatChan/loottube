<?php
/**
 * Shorts API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/shorts', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_shorts',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('loottube/v1', '/shorts/(?P<id>[\\d]+)', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_short',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('loottube/v1', '/shorts', array(
        'methods' => 'POST',
        'callback' => 'loottube_create_short',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/shorts/(?P<id>[\\d]+)/metrics', array(
        'methods' => 'POST',
        'callback' => 'loottube_update_short_metrics',
        'permission_callback' => '__return_true'
    ));
});

function loottube_get_shorts($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_shorts';
    $meta_table = $wpdb->prefix . 'loottube_user_meta';

    $limit = intval($request->get_param('limit')) ?: 20;
    $offset = intval($request->get_param('offset')) ?: 0;

    $shorts = $wpdb->get_results($wpdb->prepare(
        "SELECT s.*, u.channel_name, u.channel_handle, u.avatar
        FROM $table s
        LEFT JOIN $meta_table u ON s.user_id = u.user_id
        ORDER BY s.created_at DESC
        LIMIT %d OFFSET %d",
        $limit, $offset
    ));

    return rest_ensure_response($shorts);
}

function loottube_get_short($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_shorts';
    $meta_table = $wpdb->prefix . 'loottube_user_meta';

    $id = intval($request->get_param('id'));

    $short = $wpdb->get_row($wpdb->prepare(
        "SELECT s.*, u.channel_name, u.channel_handle, u.avatar
        FROM $table s
        LEFT JOIN $meta_table u ON s.user_id = u.user_id
        WHERE s.id = %d",
        $id
    ));

    if (!$short) {
        return new WP_Error('not_found', 'Short not found', array('status' => 404));
    }

    return rest_ensure_response($short);
}

function loottube_create_short($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_shorts';
    $user_id = get_current_user_id();

    $data = array(
        'user_id' => $user_id,
        'title' => sanitize_text_field($request->get_param('title')),
        'description' => sanitize_textarea_field($request->get_param('description')),
        'file_path' => esc_url_raw($request->get_param('filePath')),
        'thumbnail' => esc_url_raw($request->get_param('thumbnail'))
    );

    $wpdb->insert($table, $data);

    return rest_ensure_response(array(
        'success' => true,
        'id' => $wpdb->insert_id
    ));
}

function loottube_update_short_metrics($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_shorts';
    $id = $request->get_param('id');
    $action = sanitize_text_field($request->get_param('action'));

    $field_map = array(
        'view' => 'views',
        'like' => 'likes',
        'dislike' => 'dislikes',
        'comment' => 'comment_count'
    );

    if (isset($field_map[$action])) {
        $field = $field_map[$action];
        $increment = $request->get_param('increment') ? 1 : -1;

        $wpdb->query($wpdb->prepare(
            "UPDATE $table SET $field = GREATEST(0, $field + %d) WHERE id = %s",
            $increment, $id
        ));
    }

    return rest_ensure_response(array('success' => true));
}
