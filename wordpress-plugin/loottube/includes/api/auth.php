<?php
/**
 * Authentication API endpoints
 */

// Register authentication routes
add_action('rest_api_init', function() {
    // Sign up
    register_rest_route('loottube/v1', '/auth/signup', array(
        'methods' => 'POST',
        'callback' => 'loottube_signup',
        'permission_callback' => '__return_true'
    ));

    // Sign in
    register_rest_route('loottube/v1', '/auth/signin', array(
        'methods' => 'POST',
        'callback' => 'loottube_signin',
        'permission_callback' => '__return_true'
    ));

    // Sign out
    register_rest_route('loottube/v1', '/auth/signout', array(
        'methods' => 'POST',
        'callback' => 'loottube_signout',
        'permission_callback' => '__return_true'
    ));

    // Get current user
    register_rest_route('loottube/v1', '/auth/me', array(
        'methods' => 'GET',
        'callback' => 'loottube_get_current_user',
        'permission_callback' => 'is_user_logged_in'
    ));

    // Update profile
    register_rest_route('loottube/v1', '/auth/profile', array(
        'methods' => 'PUT',
        'callback' => 'loottube_update_profile',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_signup($request) {
    global $wpdb;

    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');
    $channel_name = sanitize_text_field($request->get_param('channelName'));

    if (empty($email) || empty($password) || empty($channel_name)) {
        return new WP_Error('missing_fields', 'Email, password, and channel name are required', array('status' => 400));
    }

    if (email_exists($email)) {
        return new WP_Error('email_exists', 'Email already exists', array('status' => 400));
    }

    // Create WordPress user
    $user_id = wp_create_user($email, $password, $email);

    if (is_wp_error($user_id)) {
        return $user_id;
    }

    // Generate channel handle from channel name
    $channel_handle = '@' . sanitize_title($channel_name);

    // Store additional user meta
    $table = $wpdb->prefix . 'loottube_user_meta';
    $wpdb->insert($table, array(
        'user_id' => $user_id,
        'channel_name' => $channel_name,
        'channel_handle' => $channel_handle,
        'avatar' => ''
    ));

    // Auto login after signup
    wp_set_current_user($user_id);
    wp_set_auth_cookie($user_id);

    return rest_ensure_response(array(
        'success' => true,
        'user' => loottube_get_user_data($user_id)
    ));
}

function loottube_signin($request) {
    $email = sanitize_email($request->get_param('email'));
    $password = $request->get_param('password');

    if (empty($email) || empty($password)) {
        return new WP_Error('missing_fields', 'Email and password are required', array('status' => 400));
    }

    $user = wp_authenticate($email, $password);

    if (is_wp_error($user)) {
        return new WP_Error('invalid_credentials', 'Invalid email or password', array('status' => 401));
    }

    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID);

    return rest_ensure_response(array(
        'success' => true,
        'user' => loottube_get_user_data($user->ID)
    ));
}

function loottube_signout($request) {
    wp_logout();

    return rest_ensure_response(array(
        'success' => true
    ));
}

function loottube_get_current_user($request) {
    $user_id = get_current_user_id();

    if (!$user_id) {
        return new WP_Error('not_authenticated', 'User not authenticated', array('status' => 401));
    }

    return rest_ensure_response(loottube_get_user_data($user_id));
}

function loottube_update_profile($request) {
    global $wpdb;
    $user_id = get_current_user_id();

    if (!$user_id) {
        return new WP_Error('not_authenticated', 'User not authenticated', array('status' => 401));
    }

    $channel_name = sanitize_text_field($request->get_param('channelName'));
    $avatar = esc_url_raw($request->get_param('avatar'));

    $table = $wpdb->prefix . 'loottube_user_meta';

    $data = array();
    if ($channel_name) {
        $data['channel_name'] = $channel_name;
        $data['channel_handle'] = '@' . sanitize_title($channel_name);
    }
    if ($avatar) {
        $data['avatar'] = $avatar;
    }

    if (!empty($data)) {
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id FROM $table WHERE user_id = %d",
            $user_id
        ));

        if ($existing) {
            $wpdb->update($table, $data, array('user_id' => $user_id));
        } else {
            $data['user_id'] = $user_id;
            $wpdb->insert($table, $data);
        }
    }

    return rest_ensure_response(array(
        'success' => true,
        'user' => loottube_get_user_data($user_id)
    ));
}

function loottube_get_user_data($user_id) {
    global $wpdb;

    $user = get_userdata($user_id);
    if (!$user) {
        return null;
    }

    $table = $wpdb->prefix . 'loottube_user_meta';
    $meta = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE user_id = %d",
        $user_id
    ));

    return array(
        'id' => $user->ID,
        'email' => $user->user_email,
        'channelName' => $meta ? $meta->channel_name : '',
        'channelHandle' => $meta ? $meta->channel_handle : '',
        'avatar' => $meta ? $meta->avatar : '',
        'createdAt' => $user->user_registered
    ));
}
