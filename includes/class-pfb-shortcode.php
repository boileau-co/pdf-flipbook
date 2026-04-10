<?php
/**
 * Shortcode handler for [pdf_flipbook].
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PFB_Shortcode {

	private $enqueued = false;

	public function __construct() {
		add_shortcode( 'pdf_flipbook', array( $this, 'render' ) );
	}

	/**
	 * Enqueue assets only when shortcode is present.
	 */
	private function enqueue_assets() {
		if ( $this->enqueued ) {
			return;
		}
		$this->enqueued = true;

		$v = PFB_VERSION;
		$url = PFB_PLUGIN_URL;

		// page-flip (UMD, exposes St global)
		wp_enqueue_script(
			'pfb-pageflip',
			$url . 'assets/js/vendor/page-flip.browser.js',
			array(),
			'2.0.7',
			true
		);

		// App (ES module — imports pdf.js internally)
		wp_enqueue_script(
			'pfb-flipbook',
			$url . 'assets/js/flipbook.js',
			array( 'pfb-pageflip' ),
			$v,
			true
		);

		wp_localize_script( 'pfb-flipbook', 'pfbData', array(
			'workerUrl' => $url . 'assets/js/vendor/pdf.worker.min.mjs',
		) );

		// Add type="module" to our flipbook script
		add_filter( 'script_loader_tag', array( $this, 'add_module_type' ), 10, 3 );

		wp_enqueue_style(
			'pfb-flipbook',
			$url . 'assets/css/flipbook.css',
			array(),
			$v
		);

		// Inject color overrides as CSS custom properties
		$colors = PFB_Admin::get_colors();
		$css = sprintf(
			'.pfb-wrapper { --pfb-bg: %s; --pfb-menu: %s; --pfb-accent: %s; --pfb-btn: %s; }',
			esc_attr( $colors['pfb_color_background'] ),
			esc_attr( $colors['pfb_color_menu'] ),
			esc_attr( $colors['pfb_color_accent'] ),
			esc_attr( $colors['pfb_color_button'] )
		);
		wp_add_inline_style( 'pfb-flipbook', $css );
	}

	/**
	 * Add type="module" to pdf.js script tag.
	 */
	public function add_module_type( $tag, $handle, $src ) {
		if ( 'pfb-flipbook' === $handle ) {
			$tag = str_replace( '<script ', '<script type="module" ', $tag );
		}
		return $tag;
	}

	/**
	 * Render shortcode output.
	 */
	public function render( $atts ) {
		$atts = shortcode_atts( array(
			'url' => '',
		), $atts, 'pdf_flipbook' );

		$pdf_url = esc_url( $atts['url'] );
		if ( empty( $pdf_url ) ) {
			return '<!-- pdf_flipbook: no URL provided -->';
		}

		$this->enqueue_assets();

		$id = 'pfb-' . wp_unique_id();

		return sprintf(
			'<div id="%s" class="pfb-wrapper" data-pdf-url="%s"><div class="pfb-loading">Loading PDF&hellip;</div></div>',
			esc_attr( $id ),
			esc_attr( $pdf_url )
		);
	}
}
