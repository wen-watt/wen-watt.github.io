<?php
/**
 * Wen Counter Pay · Checkout block integration.
 * License: Apache-2.0.
 */

defined( 'ABSPATH' ) || exit;

use Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType;

final class WCP_Blocks extends AbstractPaymentMethodType {

	protected $name = 'wen_counter';

	public function initialize() {
		$this->settings = get_option( 'woocommerce_wen_counter_settings', array() );
	}

	public function is_active() {
		return isset( $this->settings['enabled'] ) && 'yes' === $this->settings['enabled']
			&& isset( $this->settings['recipient'] ) && WCP_Core::is_address( trim( (string) $this->settings['recipient'] ) );
	}

	public function get_payment_method_script_handles() {
		wp_register_script( 'wcp-blocks', WCP_URL . 'assets/wcp-blocks.js', array( 'wc-blocks-registry', 'wp-element', 'wp-html-entities' ), WCP_VERSION, true );
		return array( 'wcp-blocks' );
	}

	public function get_payment_method_data() {
		return array(
			'title'       => isset( $this->settings['title'] ) ? $this->settings['title'] : 'Pay with Solana Pay',
			'description' => isset( $this->settings['description'] ) ? $this->settings['description'] : '',
			'supports'    => array( 'products' ),
		);
	}
}
