<?php
/**
 * Plugin Name:       Wen Counter Pay (Solana Pay, receive-only)
 * Plugin URI:        https://wen-watt.github.io/lab/shop-integration.html
 * Description:       Free, receive-only Solana Pay checkout for WooCommerce, built on the Wen Counter Protocol (WCP-1). Buyers pay from their own wallet to your public address; each order is confirmed from the chain (reference, recipient, token, amount, success). No keys, no fee from this plugin, devnet first.
 * Version:           0.1.0
 * Requires at least: 6.4
 * Requires PHP:      7.4
 * Author:            Wen Open Lab
 * Author URI:        https://wen-watt.github.io/
 * License:           Apache-2.0
 * License URI:       https://www.apache.org/licenses/LICENSE-2.0
 * Text Domain:       wen-counter-pay
 * WC requires at least: 8.0
 *
 * Example code, not audited. Built on Wen Counter (WCP-1), Wen Open Lab · wen-watt.github.io,
 * on Solana, Solana Pay, SPL Token and Token-2022, WNS and WEN. See NOTICE.
 */

defined( 'ABSPATH' ) || exit;

define( 'WCP_VERSION', '0.1.0' );
define( 'WCP_FILE', __FILE__ );
define( 'WCP_DIR', plugin_dir_path( __FILE__ ) );
define( 'WCP_URL', plugin_dir_url( __FILE__ ) );

require_once WCP_DIR . 'includes/class-wcp-core.php';
require_once WCP_DIR . 'includes/class-wcp-rpc.php';

/* Declare compatibility with order tables (HPOS) and the block checkout. */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', WCP_FILE, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', WCP_FILE, true );
		}
	}
);

add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
			return; // WooCommerce is not active.
		}
		require_once WCP_DIR . 'includes/class-wc-gateway-wen-counter.php';
		add_filter(
			'woocommerce_payment_gateways',
			function ( $gateways ) {
				$gateways[] = 'WC_Gateway_Wen_Counter';
				return $gateways;
			}
		);
	}
);

/* Front-end scripts: the QR generator (MIT, same file as the Wen Counter) and the status poller. Local files only. */
add_action(
	'wp_enqueue_scripts',
	function () {
		wp_register_script( 'wcp-qrcode', WCP_URL . 'assets/qrcode.js', array(), WCP_VERSION, true );
		wp_register_script( 'wcp-checkout', WCP_URL . 'assets/wcp-checkout.js', array( 'wcp-qrcode' ), WCP_VERSION, true );
		wp_register_style( 'wcp-style', WCP_URL . 'assets/wcp.css', array(), WCP_VERSION );
		if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) {
			wp_enqueue_style( 'wcp-style' );
		}
	}
);

/* Read-only status endpoint for the order received page. The order key proves the visitor owns the order. */
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'wen-counter/v1',
			'/check',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'args'                => array(
					'order' => array( 'required' => true, 'sanitize_callback' => 'absint' ),
					'key'   => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
				),
				'callback'            => 'wcp_rest_check',
			)
		);
	}
);

function wcp_gateway() {
	if ( ! class_exists( 'WC_Gateway_Wen_Counter' ) ) {
		return null;
	}
	$all = function_exists( 'WC' ) && WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
	return isset( $all[ WC_Gateway_Wen_Counter::ID ] ) ? $all[ WC_Gateway_Wen_Counter::ID ] : new WC_Gateway_Wen_Counter();
}

function wcp_rest_check( $request ) {
	$order = wc_get_order( (int) $request['order'] );
	if ( ! $order || ! hash_equals( (string) $order->get_order_key(), (string) $request['key'] ) ) {
		return new WP_REST_Response( array( 'status' => 'unknown' ), 404 );
	}
	if ( $order->is_paid() ) {
		return new WP_REST_Response( array( 'status' => 'paid', 'tx' => WC_Gateway_Wen_Counter::explorer( (string) $order->get_meta( '_wcp_signature' ), (string) $order->get_meta( '_wcp_network' ) ) ), 200 );
	}
	// At most one chain check every 3 seconds per order.
	$lock = 'wcp_lock_' . $order->get_id();
	if ( get_transient( $lock ) ) {
		return new WP_REST_Response( array( 'status' => 'waiting' ), 200 );
	}
	set_transient( $lock, 1, 3 );
	try {
		$status = wcp_gateway()->check_order( $order );
	} catch ( Exception $e ) {
		$status = 'waiting';
	}
	$out = array( 'status' => $status );
	if ( 'paid' === $status ) {
		$out['tx'] = WC_Gateway_Wen_Counter::explorer( (string) $order->get_meta( '_wcp_signature' ), (string) $order->get_meta( '_wcp_network' ) );
	}
	return new WP_REST_Response( $out, 200 );
}

/* Background check every 5 minutes for unpaid orders of the last 24 hours, so a closed tab never loses a payment. */
add_filter(
	'cron_schedules',
	function ( $s ) {
		$s['wcp_five_minutes'] = array( 'interval' => 300, 'display' => 'Every 5 minutes (Wen Counter Pay)' );
		return $s;
	}
);
register_activation_hook(
	__FILE__,
	function () {
		if ( ! wp_next_scheduled( 'wcp_check_pending' ) ) {
			wp_schedule_event( time() + 300, 'wcp_five_minutes', 'wcp_check_pending' );
		}
	}
);
register_deactivation_hook(
	__FILE__,
	function () {
		wp_clear_scheduled_hook( 'wcp_check_pending' );
	}
);
add_action( 'wcp_check_pending', 'wcp_check_pending' );

function wcp_check_pending() {
	$gw = wcp_gateway();
	if ( ! $gw || ! function_exists( 'wc_get_orders' ) ) {
		return;
	}
	$orders = wc_get_orders(
		array(
			'limit'          => 50,
			'payment_method' => WC_Gateway_Wen_Counter::ID,
			'status'         => array( 'pending', 'on-hold' ),
			'date_created'   => '>' . ( time() - DAY_IN_SECONDS ),
		)
	);
	foreach ( $orders as $order ) {
		try {
			$gw->check_order( $order );
		} catch ( Exception $e ) {
			continue; // Try again on the next run.
		}
	}
}

/* Block checkout: register the payment method for the Checkout block. */
add_action(
	'woocommerce_blocks_loaded',
	function () {
		if ( ! class_exists( '\Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType' ) ) {
			return;
		}
		require_once WCP_DIR . 'includes/class-wcp-blocks.php';
		add_action(
			'woocommerce_blocks_payment_method_type_registration',
			function ( $registry ) {
				$registry->register( new WCP_Blocks() );
			}
		);
	}
);
