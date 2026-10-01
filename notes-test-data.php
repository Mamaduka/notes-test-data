<?php
/**
 * Plugin Name:       Notes Test Data
 * Plugin URI:        https://github.com/Mamaduka/notes-test-data
 * Description:       Generate classic literature content with notes for testing, in one click.
 * Version:           0.1.0
 * Requires at least: 6.9
 * Requires PHP:      7.4
 * Author:            George Mamadashvili
 * Author URI:        https://mamaduka.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package Mamaduka\NotesTestData
 */

namespace Mamaduka\NotesTestData;

/**
 * Enqueues the editor script.
 *
 * @return void
 */
function enqueue_editor_assets() {
	wp_enqueue_script(
		'notes-test-data',
		plugins_url( 'index.js', __FILE__ ),
		array(
			'wp-api-fetch',
			'wp-block-editor',
			'wp-blocks',
			'wp-components',
			'wp-core-data',
			'wp-data',
			'wp-editor',
			'wp-element',
			'wp-notices',
			'wp-plugins',
		),
		filemtime( __DIR__ . '/index.js' ),
		true
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_editor_assets' );
