<?php
/**
 * Wen Counter Pay · WooCommerce payment gateway (receive-only, Solana Pay).
 * The buyer pays from their own wallet; the shop's wallet is only an address here.
 * The server confirms each payment from the chain with the WCP-1 five-point check.
 * License: Apache-2.0. Example code, not audited. Devnet first.
 */

defined( 'ABSPATH' ) || exit;

class WC_Gateway_Wen_Counter extends WC_Payment_Gateway {

	const ID = 'wen_counter';

	/** @var callable|null test hook passed to WCP_RPC */
	public static $transport = null;

	public function __construct() {
		$this->id                 = self::ID;
		$this->method_title       = 'Wen Counter (Solana Pay)';
		$this->method_description = 'Free, receive-only Solana Pay checkout. Buyers pay from their own wallet to your public address; the order is marked paid after the chain confirms reference, recipient, token, amount and success. No keys, no fee from this plugin. Devnet first.';
		$this->has_fields         = false;
		$this->supports           = array( 'products' );

		$this->init_form_fields();
		$this->init_settings();

		$this->title       = $this->get_option( 'title', 'Pay with Solana Pay' );
		$this->description = $this->get_option( 'description', 'Scan a QR code with any Solana wallet. Your order is confirmed on-chain in seconds.' );
		$this->enabled     = $this->get_option( 'enabled', 'no' );

		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		add_action( 'woocommerce_thankyou_' . $this->id, array( $this, 'thankyou_page' ) );
	}

	public function init_form_fields() {
		$tokens = array();
		foreach ( WCP_Core::TOKENS as $k => $t ) {
			if ( 'usdc-devnet' === $k ) {
				continue;
			}
			$tokens[ 'usdc-mainnet' === $k ? 'usdc' : $k ] = $t['label'];
		}
		$tokens['custom'] = 'Custom SPL token (mint below)';

		$this->form_fields = array(
			'enabled'     => array( 'title' => 'Enable', 'type' => 'checkbox', 'label' => 'Enable Wen Counter (Solana Pay)', 'default' => 'no' ),
			'title'       => array( 'title' => 'Title at checkout', 'type' => 'text', 'default' => 'Pay with Solana Pay' ),
			'description' => array( 'title' => 'Description at checkout', 'type' => 'textarea', 'default' => 'Scan a QR code with any Solana wallet. Your order is confirmed on-chain in seconds.' ),
			'recipient'   => array( 'title' => 'Receiving address (public key only)', 'type' => 'text', 'description' => 'Copy it from your wallet: Receive → Solana. Never enter a seed phrase or private key anywhere.', 'default' => '' ),
			'shop_label'  => array( 'title' => 'Shop name shown in the wallet', 'type' => 'text', 'default' => get_bloginfo( 'name' ) ),
			'network'     => array( 'title' => 'Network', 'type' => 'select', 'options' => array( 'devnet' => 'Devnet (test, coins have no value)', 'mainnet' => 'Mainnet (real money)' ), 'default' => 'devnet' ),
			'mainnet_ok'  => array( 'title' => 'Mainnet confirmation', 'type' => 'checkbox', 'label' => 'I tested on devnet and understand mainnet moves real money', 'default' => 'no' ),
			'token'       => array( 'title' => 'Token to accept', 'type' => 'select', 'options' => $tokens, 'default' => 'usdc', 'description' => 'USDC keeps prices stable. On devnet, USDC uses the devnet test mint.' ),
			'custom_mint' => array( 'title' => 'Custom token mint', 'type' => 'text', 'default' => '' ),
			'rate'        => array( 'title' => 'Tokens per 1 unit of shop currency', 'type' => 'text', 'default' => '1', 'description' => 'Example: shop in USD and token USDC → 1. For other pairs set your own rate; the amount is rounded up so you never receive less than the order total.' ),
			'memo'        => array( 'title' => 'Order number in memo', 'type' => 'checkbox', 'label' => 'Ask the wallet to add "order:<number>" as a public memo', 'default' => 'yes' ),
			'rpc_url'     => array( 'title' => 'RPC endpoint (optional, https)', 'type' => 'text', 'default' => '', 'description' => 'Busy shops: use your own provider endpoint; public endpoints are rate-limited.' ),
		);
	}

	/** Validate before saving: a real address, a known or valid token, a positive rate, mainnet only after confirmation. */
	public function process_admin_options() {
		$saved = parent::process_admin_options();
		$errors = array();
		$recipient = trim( (string) $this->get_option( 'recipient' ) );
		if ( '' !== $recipient && ! WCP_Core::is_address( $recipient ) ) {
			$errors[] = 'Receiving address is not a Solana address.';
			$this->update_option( 'recipient', '' );
		}
		if ( 'custom' === $this->get_option( 'token' ) && ! WCP_Core::is_address( trim( (string) $this->get_option( 'custom_mint' ) ) ) ) {
			$errors[] = 'Custom token mint is not a Solana address.';
		}
		$rate = trim( (string) $this->get_option( 'rate' ) );
		if ( ! preg_match( '/^\d+(\.\d+)?$/', $rate ) || ! preg_match( '/[1-9]/', $rate ) ) {
			$errors[] = 'Rate must be a positive number.';
			$this->update_option( 'rate', '1' );
		}
		if ( 'mainnet' === $this->get_option( 'network' ) && 'yes' !== $this->get_option( 'mainnet_ok' ) ) {
			$errors[] = 'Mainnet needs the confirmation checkbox; switched back to devnet.';
			$this->update_option( 'network', 'devnet' );
		}
		foreach ( $errors as $e ) {
			WC_Admin_Settings::add_error( 'Wen Counter: ' . $e );
		}
		return $saved;
	}

	/** Available only when the gateway has a valid receiving address. */
	public function is_available() {
		return 'yes' === $this->enabled && WCP_Core::is_address( trim( (string) $this->get_option( 'recipient' ) ) ) && parent::is_available();
	}

	public function network() {
		return ( 'mainnet' === $this->get_option( 'network' ) && 'yes' === $this->get_option( 'mainnet_ok' ) ) ? 'mainnet' : 'devnet';
	}

	public function rpc() {
		return new WCP_RPC( $this->network(), $this->get_option( 'rpc_url' ), self::$transport );
	}

	/** array( mint|null, decimals, label ) for the configured token on the configured network. */
	public function token() {
		$k = $this->get_option( 'token', 'usdc' );
		if ( 'usdc' === $k ) {
			$t = WCP_Core::TOKENS[ 'devnet' === $this->network() ? 'usdc-devnet' : 'usdc-mainnet' ];
			return array( $t['mint'], $t['decimals'], 'USDC' );
		}
		if ( isset( WCP_Core::TOKENS[ $k ] ) ) {
			$t = WCP_Core::TOKENS[ $k ];
			return array( $t['mint'], $t['decimals'], $t['label'] );
		}
		$mint = trim( (string) $this->get_option( 'custom_mint' ) );
		if ( ! WCP_Core::is_address( $mint ) ) {
			throw new RuntimeException( 'Custom token mint is not set' );
		}
		$cache = 'wcp_dec_' . $this->network() . '_' . $mint;
		$dec   = get_transient( $cache );
		if ( false === $dec ) {
			$dec = $this->rpc()->mint_decimals( $mint );
			set_transient( $cache, $dec, DAY_IN_SECONDS );
		}
		return array( $mint, (int) $dec, 'token' );
	}

	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );
		try {
			list( $mint, $decimals, $label ) = $this->token();
			$amount    = WCP_Core::token_amount( $order->get_total(), $this->get_option( 'rate', '1' ), $decimals );
			$units     = WCP_Core::to_base_units( $amount, $decimals );
			$reference = WCP_Core::new_reference();
			$memo      = 'yes' === $this->get_option( 'memo', 'yes' ) ? WCP_Core::build_memo( $order->get_order_number() ) : '';
			$url       = WCP_Core::build_pay_url( trim( (string) $this->get_option( 'recipient' ) ), $amount, $mint, $reference, (string) $this->get_option( 'shop_label' ), 'Order ' . $order->get_order_number(), $memo );
		} catch ( Exception $e ) {
			wc_add_notice( 'Solana Pay is not available right now: ' . $e->getMessage(), 'error' );
			return array( 'result' => 'failure' );
		}
		$order->update_meta_data( '_wcp_reference', $reference );
		$order->update_meta_data( '_wcp_amount', $amount );
		$order->update_meta_data( '_wcp_units', $units );
		$order->update_meta_data( '_wcp_mint', (string) $mint );
		$order->update_meta_data( '_wcp_token_label', $label );
		$order->update_meta_data( '_wcp_recipient', trim( (string) $this->get_option( 'recipient' ) ) );
		$order->update_meta_data( '_wcp_network', $this->network() );
		$order->update_meta_data( '_wcp_url', $url );
		$order->update_status( 'pending', sprintf( 'Awaiting Solana Pay: %s %s on %s, reference %s.', $amount, $label, $this->network(), $reference ) );
		$order->save();
		if ( function_exists( 'WC' ) && WC()->cart ) {
			WC()->cart->empty_cart();
		}
		return array( 'result' => 'success', 'redirect' => $this->get_return_url( $order ) );
	}

	/** Check the chain for this order's payment. Returns 'paid', 'waiting' or 'mismatch'. */
	public function check_order( $order ) {
		if ( ! $order || self::ID !== $order->get_payment_method() ) {
			return 'waiting';
		}
		if ( $order->is_paid() ) {
			return 'paid';
		}
		$reference = (string) $order->get_meta( '_wcp_reference' );
		if ( ! WCP_Core::is_address( $reference ) ) {
			return 'waiting';
		}
		$rpc = new WCP_RPC( (string) $order->get_meta( '_wcp_network' ), $this->get_option( 'rpc_url' ), self::$transport );
		$sig = $rpc->find_reference( $reference );
		if ( ! $sig || ! WCP_Core::is_signature( $sig ) ) {
			return 'waiting';
		}
		$tx   = $rpc->get_transaction( $sig );
		$mint = (string) $order->get_meta( '_wcp_mint' );
		$r    = WCP_Core::verify_payment( $tx, (string) $order->get_meta( '_wcp_recipient' ), $reference, '' === $mint ? null : $mint, (string) $order->get_meta( '_wcp_units' ) );
		if ( ! $r['ok'] ) {
			if ( $order->get_meta( '_wcp_last_sig' ) !== $sig ) {
				$order->update_meta_data( '_wcp_last_sig', $sig );
				$order->add_order_note( 'Solana Pay: a transaction with this reference did not pass the check: ' . implode( '; ', $r['reasons'] ) );
				$order->save();
			}
			return 'mismatch';
		}
		// One transaction pays one order.
		$dupes = wc_get_orders( array( 'limit' => 1, 'return' => 'ids', 'meta_key' => '_wcp_signature', 'meta_value' => $sig ) ); // phpcs:ignore
		if ( ! empty( $dupes ) && (int) $dupes[0] !== (int) $order->get_id() ) {
			$order->add_order_note( 'Solana Pay: transaction ' . $sig . ' already paid another order.' );
			$order->save();
			return 'mismatch';
		}
		$order->update_meta_data( '_wcp_signature', $sig );
		$order->update_meta_data( '_wcp_received', $r['received'] );
		$order->update_meta_data( '_wcp_fee_lamports', $r['fee'] );
		$order->save();
		$order->payment_complete( $sig );
		$order->add_order_note( 'Solana Pay: paid and confirmed on-chain (reference, recipient, token, amount, success). ' . self::explorer( $sig, (string) $order->get_meta( '_wcp_network' ) ) );
		return 'paid';
	}

	public static function explorer( $sig, $network ) {
		return 'https://explorer.solana.com/tx/' . rawurlencode( $sig ) . ( 'mainnet' === $network ? '' : '?cluster=devnet' );
	}

	/** Order received page: the QR, the wallet link and a live status. */
	public function thankyou_page( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}
		if ( $order->is_paid() ) {
			$sig = (string) $order->get_meta( '_wcp_signature' );
			echo '<section class="wcp-box"><p class="wcp-status wcp-ok">✓ Paid. Confirmed on-chain.</p>';
			if ( $sig ) {
				echo '<p><a href="' . esc_url( self::explorer( $sig, (string) $order->get_meta( '_wcp_network' ) ) ) . '" target="_blank" rel="noopener">View the transaction</a></p>';
			}
			echo '</section>';
			return;
		}
		$url       = (string) $order->get_meta( '_wcp_url' );
		$recipient = (string) $order->get_meta( '_wcp_recipient' );
		wp_enqueue_script( 'wcp-qrcode' );
		wp_enqueue_script( 'wcp-checkout' );
		wp_localize_script(
			'wcp-checkout',
			'WCP_ORDER',
			array(
				'check' => esc_url_raw( rest_url( 'wen-counter/v1/check' ) ),
				'order' => (int) $order->get_id(),
				'key'   => $order->get_order_key(),
				'url'   => $url,
			)
		);
		echo '<section class="wcp-box" id="wcp-box">';
		echo '<h2>' . esc_html__( 'Pay with Solana Pay', 'wen-counter-pay' ) . '</h2>';
		echo '<p class="wcp-amount"><strong>' . esc_html( $order->get_meta( '_wcp_amount' ) . ' ' . $order->get_meta( '_wcp_token_label' ) ) . '</strong>';
		if ( 'devnet' === $order->get_meta( '_wcp_network' ) ) {
			echo ' <span class="wcp-badge">devnet</span>';
		}
		echo '</p>';
		echo '<div id="wcp-qr" class="wcp-qr" aria-label="' . esc_attr__( 'Solana Pay QR code', 'wen-counter-pay' ) . '"></div>';
		echo '<p><a class="button" id="wcp-open" href="' . esc_url( $url, array( 'solana' ) ) . '">' . esc_html__( 'Open in wallet', 'wen-counter-pay' ) . '</a></p>';
		echo '<p class="wcp-to">' . esc_html__( 'Pays to', 'wen-counter-pay' ) . ' <code>' . esc_html( substr( $recipient, 0, 5 ) . '…' . substr( $recipient, -5 ) ) . '</code> — ' . esc_html__( 'check these characters in your wallet before you confirm.', 'wen-counter-pay' ) . '</p>';
		echo '<p class="wcp-status" id="wcp-status" role="status">' . esc_html__( 'Waiting for the payment…', 'wen-counter-pay' ) . '</p>';
		echo '<p class="wcp-note">' . esc_html__( 'Receive-only checkout: this page never asks for your keys and cannot move funds.', 'wen-counter-pay' ) . '</p>';
		echo '</section>';
	}
}
