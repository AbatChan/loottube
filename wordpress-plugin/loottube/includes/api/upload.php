<?php
/**
 * Upload API endpoints
 */

add_action('rest_api_init', function() {
    register_rest_route('loottube/v1', '/upload', array(
        'methods' => 'POST',
        'callback' => 'loottube_upload_file',
        'permission_callback' => 'is_user_logged_in'
    ));
});

function loottube_upload_file($request) {
    $user_id = get_current_user_id();

    if (!function_exists('wp_handle_upload')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }

    $files = $request->get_file_params();

    if (empty($files) || !isset($files['file'])) {
        return new WP_Error('no_file', 'No file uploaded', array('status' => 400));
    }

    $file = $files['file'];

    // Set up upload overrides
    $upload_overrides = array(
        'test_form' => false,
        'mimes' => array(
            'mp4' => 'video/mp4',
            'webm' => 'video/webm',
            'mov' => 'video/quicktime',
            'avi' => 'video/x-msvideo',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif'
        )
    );

    $uploaded_file = wp_handle_upload($file, $upload_overrides);

    if (isset($uploaded_file['error'])) {
        return new WP_Error('upload_error', $uploaded_file['error'], array('status' => 500));
    }

    return rest_ensure_response(array(
        'success' => true,
        'url' => $uploaded_file['url'],
        'file' => $uploaded_file['file'],
        'type' => $uploaded_file['type']
    ));
}
