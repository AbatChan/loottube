<?php
/**
 * Notifications API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/notifications', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_notifications',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/notifications', array(
        'methods' => 'POST',
        'callback' => 'loottube_create_notification',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/notifications/(?P<id>[\\d]+)/read', array(
        'methods' => 'POST',
        'callback' => 'loottube_mark_notification_read',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/notifications/mark-all-read', array(
        'methods' => 'POST',
        'callback' => 'loottube_mark_all_notifications_read',
        'permission_callback' => 'is_user_logged_in'
    ));

    register_rest_route('loottube/v1', '/notifications/(?P<id>[\\d]+)', array(
        'methods' => 'DELETE',
        'callback' => 'loottube_delete_notification',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_get_notifications($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_notifications';
    $user_id = get_current_user_id();

    $notifications = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table WHERE user_id = %d ORDER BY created_at DESC LIMIT 50",
        $user_id
    ));

    return rest_ensure_response($notifications);
}

function loottube_create_notification($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_notifications';
    $user_id = intval($request->get_param('userId')) ?: get_current_user_id();

    $data = array(
        'user_id' => $user_id,
        'title' => sanitize_text_field($request->get_param('title')),
        'description' => sanitize_textarea_field($request->get_param('description')),
        'type' => sanitize_text_field($request->get_param('type'))
    );

    $wpdb->insert($table, $data);

    return rest_ensure_response(array(
        'success' => true,
        'id' => $wpdb->insert_id
    ));
}

function loottube_mark_notification_read($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_notifications';
    $user_id = get_current_user_id();
    $id = intval($request->get_param('id'));

    $wpdb->update(
        $table,
        array('is_read' => 1),
        array('id' => $id, 'user_id' => $user_id)
    );

    return rest_ensure_response(array('success' => true));
}

function loottube_mark_all_notifications_read($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_notifications';
    $user_id = get_current_user_id();

    $wpdb->update(
        $table,
        array('is_read' => 1),
        array('user_id' => $user_id)
    );

    return rest_ensure_response(array('success' => true));
}

function loottube_delete_notification($request) {
    global $wpdb;
    $table = $wpdb->prefix . 'loottube_notifications';
    $user_id = get_current_user_id();
    $id = intval($request->get_param('id'));

    $wpdb->delete($table, array('id' => $id, 'user_id' => $user_id));

    return rest_ensure_response(array('success' => true));
}
