<?php
/**
 * Admin settings page for PDF Flipbook.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PFB_Admin {

	/** Default color values. */
	const DEFAULTS = array(
		'pfb_color_background' => '#f0f0f0',
		'pfb_color_menu'       => '#2a2a3a',
		'pfb_color_accent'     => '#64ffda',
		'pfb_color_button'     => '#ccd6f6',
	);

	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	/**
	 * Add submenu under Settings.
	 */
	public function add_menu() {
		add_options_page(
			'PDF Flipbook Settings',
			'PDF Flipbook',
			'manage_options',
			'pdf-flipbook',
			array( $this, 'render_page' )
		);
	}

	/**
	 * Register settings and fields.
	 */
	public function register_settings() {
		register_setting( 'pfb_settings', 'pfb_color_background', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_hex_color',
			'default'           => self::DEFAULTS['pfb_color_background'],
		) );
		register_setting( 'pfb_settings', 'pfb_color_menu', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_hex_color',
			'default'           => self::DEFAULTS['pfb_color_menu'],
		) );
		register_setting( 'pfb_settings', 'pfb_color_accent', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_hex_color',
			'default'           => self::DEFAULTS['pfb_color_accent'],
		) );
		register_setting( 'pfb_settings', 'pfb_color_button', array(
			'type'              => 'string',
			'sanitize_callback' => 'sanitize_hex_color',
			'default'           => self::DEFAULTS['pfb_color_button'],
		) );

		add_settings_section(
			'pfb_colors_section',
			'Color Settings',
			function () {
				echo '<p>Customize the appearance of the PDF Flipbook viewer. Leave blank to use defaults.</p>';
			},
			'pdf-flipbook'
		);

		$fields = array(
			'pfb_color_background' => 'Background Color',
			'pfb_color_menu'       => 'Menu Color',
			'pfb_color_accent'     => 'Accent Color',
			'pfb_color_button'     => 'Menu Button Color',
		);

		foreach ( $fields as $key => $label ) {
			add_settings_field(
				$key,
				$label,
				array( $this, 'render_color_field' ),
				'pdf-flipbook',
				'pfb_colors_section',
				array( 'key' => $key )
			);
		}
	}

	/**
	 * Render a single color picker field.
	 */
	public function render_color_field( $args ) {
		$key     = $args['key'];
		$default = self::DEFAULTS[ $key ];
		$value   = get_option( $key, $default );
		printf(
			'<input type="color" id="%1$s" name="%1$s" value="%2$s" /> ' .
			'<code>%2$s</code> ' .
			'<button type="button" class="button button-small pfb-reset-color" data-target="%1$s" data-default="%3$s">Reset</button>' .
			'<p class="description">Default: <code>%3$s</code></p>',
			esc_attr( $key ),
			esc_attr( $value ),
			esc_attr( $default )
		);
	}

	/**
	 * Render the settings page.
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1>PDF Flipbook Settings</h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'pfb_settings' );
				do_settings_sections( 'pdf-flipbook' );
				submit_button();
				?>
			</form>
			<script>
				document.querySelectorAll('.pfb-reset-color').forEach(function(btn) {
					btn.addEventListener('click', function() {
						var target = document.getElementById(this.dataset.target);
						target.value = this.dataset.default;
						target.dispatchEvent(new Event('input'));
					});
				});
			</script>
		</div>
		<?php
	}

	/**
	 * Get all color values (with defaults).
	 */
	public static function get_colors() {
		$colors = array();
		foreach ( self::DEFAULTS as $key => $default ) {
			$colors[ $key ] = get_option( $key, $default );
		}
		return $colors;
	}
}
