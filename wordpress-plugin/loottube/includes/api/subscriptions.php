<?php
/**
 * Subscriptions API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/subscriptions', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_subscriptions',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/subscriptions/toggle', array(
        'methods' => 'POST',
        'callback' => 'loottube_toggle_subscription',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_get_subscriptions($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_subscriptions';
    $user_id = get_current_user_id();

    $subscriptions = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table WHERE subscriber_id = %d ORDER BY created_at DESC",
        $user_id
    ));

    return rest_ensure_response($subscriptions);
}

function loottube_toggle_subscription($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_subscriptions';
    $user_id = get_current_user_id();

    $channel_id = sanitize_text_field($request->get_param('channelId'));
    $channel_name = sanitize_text_field($request->get_param('channelName'));
    $channel_handle = sanitize_text_field($request->get_param('channelHandle'));

    // Check if already subscribed
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE subscriber_id = %d AND channel_id = %s",
        $user_id, $channel_id
    ));

    if ($existing) {
        // Unsubscribe
        $wpdb->delete($table, array(
            'subscriber_id' => $user_id,
            'channel_id' => $channel_id
        ));
        $subscribed = false;
    } else {
        // Subscribe
        $wpdb->insert($table, array(
            'subscriber_id' => $user_id,
            'channel_id' => $channel_id,
            'channel_name' => $channel_name,
            'channel_handle' => $channel_handle
        ));
        $subscribed = true;
    }

    return rest_ensure_response(array(
        'success' => true,
        'subscribed' => $subscribed
    ));
}
