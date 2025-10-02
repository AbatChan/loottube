<?php
/**
 * Users API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/users/(?P<handle>[@\\w\\-\\.]+)', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_user_by_handle',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('loottube/v1', '/users/(?P<id>[\\d]+)/videos', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_user_videos',
        'permission_callback' => '__return_true'
    ));

    register_rest_route('loottube/v1', '/users/(?P<id>[\\d]+)/shorts', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_user_shorts',
        'permission_callback' => '__return_true'
    ));
});

function loottube_get_user_by_handle($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_user_meta';

    $handle = sanitize_text_field($request->get_param('handle'));
    $handle = ltrim($handle, '@');

    $user_meta = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE channel_handle = %s OR channel_handle = %s",
        $handle, '@' . $handle
    ));

    if (!$user_meta) {
        return new WP_Error('not_found', 'User not found', array('status' => 404));
    }

    $user = get_userdata($user_meta->user_id);

    return rest_ensure_response(array(
        'id' => $user->ID,
        'channelName' => $user_meta->channel_name,
        'channelHandle' => $user_meta->channel_handle,
        'avatar' => $user_meta->avatar,
        'createdAt' => $user->user_registered
    ));
}

function loottube_get_user_videos($request) {
    global $wpdb;
    $videos_table = $wpdb->prefix . 'loottube_videos';
    $user_id = intval($request->get_param('id'));

    $videos = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $videos_table WHERE user_id = %d AND visibility = 'public' ORDER BY created_at DESC",
        $user_id
    ));

    return rest_ensure_response($videos);
}

function loottube_get_user_shorts($request) {
    global $wpdb;
    $shorts_table = $wpdb->prefix . 'loottube_shorts';
    $user_id = intval($request->get_param('id'));

    $shorts = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $shorts_table WHERE user_id = %d ORDER BY created_at DESC",
        $user_id
    ));

    return rest_ensure_response($shorts);
}
