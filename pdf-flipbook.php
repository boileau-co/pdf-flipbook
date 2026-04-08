<?php
/**
 * Plugin Name: PDF Flipbook by Boileau & Co.
 * Plugin URI: https://github.com/boileau-co/pdf-flipbook
 * Description: A lightweight flipbook-style PDF viewer powered by pdf.js and page-flip. Use [pdf_flipbook url="..."] to embed.
 * Version: 3.0.3
 * Author: Boileau & Co.
 * Author URI: https://boileau.co
 * Text Domain: pdf-flipbook
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * GitHub Plugin URI: boileau-co/pdf-flipbook
 * GitHub Branch: main
 * Primary Branch: main
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PFB_VERSION', '3.0.3' );
define( 'PFB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'PFB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'PFB_PLUGIN_FILE', __FILE__ );

// GitHub update checker
if ( file_exists( PFB_PLUGIN_DIR . 'plugin-update-checker/plugin-update-checker.php' ) ) {
	require_once PFB_PLUGIN_DIR . 'plugin-update-checker/plugin-update-checker.php';
	$pfb_update_checker = \YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
		'https://github.com/boileau-co/pdf-flipbook/',
		__FILE__,
		'pdf-flipbook'
	);
	$pfb_update_checker->setBranch( 'main' );
	$pfb_update_checker->addResultFilter( function ( $pluginInfo ) {
		$pluginInfo->icons = array(
			'svg' => PFB_PLUGIN_URL . 'assets/images/icon.svg',
		);
		return $pluginInfo;
	} );
}

require_once PFB_PLUGIN_DIR . 'includes/class-pfb-shortcode.php';

function pfb_init() {
	new PFB_Shortcode();
}
add_action( 'plugins_loaded', 'pfb_init' );
