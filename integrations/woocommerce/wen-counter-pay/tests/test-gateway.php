<?php
/**
 * Wen Counter Pay · gateway flow tests on small WordPress and WooCommerce stand-ins (no network, no WordPress install).
 * Covers: settings validation, order → QR data, chain check (paid, underpaid, wrong token, failed, foreign reference),
 * one transaction pays one order, the REST status endpoint and its order-key check, and the 5-minute background check.
 * Run: php tests/test-gateway.php · Apache-2.0
 */
define( 'ABSPATH', __DIR__ );
define( 'DAY_IN_SECONDS', 86400 );

/* ---------- stand-ins ---------- */
$GLOBALS['wcp_hooks'] = array(); $GLOBALS['wcp_tr'] = array(); $GLOBALS['wcp_orders'] = array(); $GLOBALS['wcp_errors'] = array(); $GLOBALS['wcp_scripts'] = array(); $GLOBALS['wcp_options'] = array();
function add_action( $h, $f ) { $GLOBALS['wcp_hooks'][ $h ][] = $f; } function add_filter( $h, $f ) { $GLOBALS['wcp_hooks'][ $h ][] = $f; }
function do_hook( $h, ...$a ) { $r = null; foreach ( isset( $GLOBALS['wcp_hooks'][ $h ] ) ? $GLOBALS['wcp_hooks'][ $h ] : array() as $f ) { $r = $f( ...$a ); } return $r; }
function plugin_dir_path( $f ) { return dirname( $f ) . '/'; } function plugin_dir_url( $f ) { return 'https://shop.test/wp-content/plugins/wen-counter-pay/'; }
function register_activation_hook( $f, $c ) {} function register_deactivation_hook( $f, $c ) {} function wp_next_scheduled( $h ) { return false; } function wp_schedule_event() {} function wp_clear_scheduled_hook() {}
function get_transient( $k ) { return isset( $GLOBALS['wcp_tr'][ $k ] ) ? $GLOBALS['wcp_tr'][ $k ] : false; } function set_transient( $k, $v, $t ) { $GLOBALS['wcp_tr'][ $k ] = $v; }
function get_option( $k, $d = false ) { return isset( $GLOBALS['wcp_options'][ $k ] ) ? $GLOBALS['wcp_options'][ $k ] : $d; }
function get_bloginfo( $k ) { return 'Rose Corner'; } function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); } function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
function esc_html__( $s, $d = '' ) { return esc_html( $s ); } function esc_attr__( $s, $d = '' ) { return esc_attr( $s ); }
function esc_url( $u, $p = null ) { $ok = array_merge( array( 'http', 'https' ), (array) $p ); $s = strtolower( (string) strtok( $u, ':' ) ); return in_array( $s, $ok, true ) ? htmlspecialchars( $u, ENT_QUOTES ) : ''; }
function esc_url_raw( $u ) { return $u; } function rest_url( $p ) { return 'https://shop.test/wp-json/' . $p; } function absint( $v ) { return abs( (int) $v ); } function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function wp_enqueue_script( $h ) { $GLOBALS['wcp_scripts'][] = $h; } function wp_localize_script( $h, $n, $d ) { $GLOBALS['wcp_loc'] = $d; } function wp_register_script() {} function wp_register_style() {} function wp_enqueue_style() {}
function wc_add_notice( $m, $t ) { $GLOBALS['wcp_notice'] = $m; } function wp_json_encode( $d ) { return json_encode( $d ); }
class WP_REST_Response { public $data; public $status; function __construct( $d, $s ) { $this->data = $d; $this->status = $s; } }
class WC_Admin_Settings { static function add_error( $m ) { $GLOBALS['wcp_errors'][] = $m; } }
class WC_Payment_Gateway {
	public $id, $settings = array(), $form_fields = array(), $enabled, $title, $description, $method_title, $method_description, $has_fields, $supports;
	function init_settings() { foreach ( $this->form_fields as $k => $f ) { $this->settings[ $k ] = isset( $GLOBALS['wcp_settings'][ $k ] ) ? $GLOBALS['wcp_settings'][ $k ] : ( isset( $f['default'] ) ? $f['default'] : '' ); } }
	function get_option( $k, $d = null ) { return isset( $this->settings[ $k ] ) ? $this->settings[ $k ] : $d; }
	function update_option( $k, $v ) { $this->settings[ $k ] = $v; return true; }
	function process_admin_options() { foreach ( $GLOBALS['wcp_post'] as $k => $v ) { $this->settings[ $k ] = $v; } return true; }
	function is_available() { return true; }
	function get_return_url( $o ) { return 'https://shop.test/checkout/order-received/' . $o->get_id() . '/?key=' . $o->get_order_key(); }
}
class Fake_Order {
	public $id, $total, $key, $meta = array(), $status = 'pending', $notes = array(), $paid = false, $method = 'wen_counter', $txid = null, $created;
	function __construct( $id, $total ) { $this->id = $id; $this->total = $total; $this->key = 'wc_order_' . bin2hex( random_bytes( 6 ) ); $this->created = time(); }
	function get_id() { return $this->id; } function get_total() { return $this->total; } function get_order_number() { return (string) $this->id; } function get_order_key() { return $this->key; }
	function get_payment_method() { return $this->method; } function update_meta_data( $k, $v ) { $this->meta[ $k ] = $v; } function get_meta( $k ) { return isset( $this->meta[ $k ] ) ? $this->meta[ $k ] : ''; }
	function save() {} function update_status( $s, $n = '' ) { $this->status = $s; if ( $n ) { $this->notes[] = $n; } } function add_order_note( $n ) { $this->notes[] = $n; }
	function is_paid() { return $this->paid; } function payment_complete( $tx ) { $this->paid = true; $this->status = 'processing'; $this->txid = $tx; }
	function get_date_created() { return new DateTime( '@' . $this->created ); } function get_billing_email() { return 'buyer@example.com'; }
	function get_checkout_order_received_url() { return 'https://shop.test/checkout/order-received/' . $this->id . '/?key=' . $this->key; }
}
function wc_get_order( $id ) { return isset( $GLOBALS['wcp_orders'][ $id ] ) ? $GLOBALS['wcp_orders'][ $id ] : false; }
function wc_get_orders( $q ) {
	$out = array();
	foreach ( $GLOBALS['wcp_orders'] as $o ) {
		if ( isset( $q['meta_key'] ) && $o->get_meta( $q['meta_key'] ) !== $q['meta_value'] ) { continue; }
		if ( isset( $q['payment_method'] ) && $o->method !== $q['payment_method'] ) { continue; }
		if ( isset( $q['status'] ) && ! in_array( $o->status, (array) $q['status'], true ) ) { continue; }
		$out[] = ( isset( $q['return'] ) && 'ids' === $q['return'] ) ? $o->id : $o;
	}
	return $out;
}
class Fake_Cart { public $emptied = false; function empty_cart() { $this->emptied = true; } }
class Fake_PG { function payment_gateways() { return array( 'wen_counter' => $GLOBALS['wcp_gw'] ); } }
class Fake_Mailer { function wrap_message( $h, $b ) { return "<h1>$h</h1>$b"; } function send( $to, $subj, $msg ) { $GLOBALS['wcp_mail'][] = array( $to, $subj, $msg ); return true; } }
class Fake_WC { public $cart; function __construct() { $this->cart = new Fake_Cart(); } function payment_gateways() { return new Fake_PG(); } function mailer() { return new Fake_Mailer(); } }
function is_email( $e ) { return (bool) filter_var( $e, FILTER_VALIDATE_EMAIL ); } if ( ! defined( 'DAY_IN_SECONDS' ) ) { define( 'DAY_IN_SECONDS', 86400 ); }
function WC() { static $w; if ( ! $w ) { $w = new Fake_WC(); } return $w; }

/* ---------- load the plugin ---------- */
require __DIR__ . '/../wen-counter-pay.php';
do_hook( 'plugins_loaded' );
$gateways = do_hook( 'woocommerce_payment_gateways', array() );

$n = 0; $fail = 0;
function t( $name, $f ) { global $n, $fail; try { $f(); $n++; echo "ok $name\n"; } catch ( Throwable $e ) { $fail++; echo "FAIL $name: " . $e->getMessage() . ' @' . $e->getLine() . "\n"; } }
function ok( $c, $m = 'assertion failed' ) { if ( ! $c ) { throw new Exception( $m ); } }

$SHOP  = WCP_Core::new_reference(); $PAYER = WCP_Core::new_reference(); $USDC_DEV = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
$GLOBALS['wcp_settings'] = array( 'enabled' => 'yes', 'recipient' => $SHOP, 'network' => 'devnet', 'token' => 'usdc', 'rate' => '1' );
function gw() { $g = new WC_Gateway_Wen_Counter(); $GLOBALS['wcp_gw'] = $g; return $g; }

/* chain stand-in: reference -> signature, signature -> transaction; every call is recorded */
$GLOBALS['chain'] = array( 'refs' => array(), 'txs' => array(), 'calls' => array() );
WC_Gateway_Wen_Counter::$transport = function ( $method, $params ) {
	$GLOBALS['chain']['calls'][] = $method;
	if ( 'getSignaturesForAddress' === $method ) { $s = isset( $GLOBALS['chain']['refs'][ $params[0] ] ) ? $GLOBALS['chain']['refs'][ $params[0] ] : array(); return array_map( function ( $x ) { return array( 'signature' => $x ); }, array_slice( (array) $s, 0, $params[1]['limit'] ) ); }
	if ( 'getTransaction' === $method ) { return isset( $GLOBALS['chain']['txs'][ $params[0] ] ) ? $GLOBALS['chain']['txs'][ $params[0] ] : null; }
	return null;
};
function spl_tx( $owner, $mint, $pre, $post, $refs, $err = null ) {
	$keys = array_merge( array( $GLOBALS['PAYER'] ?? WCP_Core::new_reference(), $owner ), $refs );
	return array( 'meta' => array( 'err' => $err, 'fee' => 5000, 'preBalances' => array(), 'postBalances' => array(), 'preTokenBalances' => array( array( 'owner' => $owner, 'mint' => $mint, 'uiTokenAmount' => array( 'amount' => (string) $pre ) ) ), 'postTokenBalances' => array( array( 'owner' => $owner, 'mint' => $mint, 'uiTokenAmount' => array( 'amount' => (string) $post ) ) ) ), 'transaction' => array( 'message' => array( 'accountKeys' => $keys ) ) );
}
function pay( $order, $units, $mint = null, $err = null, $extra_refs = array() ) {
	$sig = WCP_Core::b58encode( random_bytes( 64 ) ); $ref = $order->get_meta( '_wcp_reference' );
	$GLOBALS['chain']['refs'][ $ref ] = $sig; foreach ( $extra_refs as $r ) { $GLOBALS['chain']['refs'][ $r ] = $sig; }
	$GLOBALS['chain']['txs'][ $sig ] = spl_tx( $order->get_meta( '_wcp_recipient' ), $mint ?: $order->get_meta( '_wcp_mint' ), 0, $units, array_merge( array( $ref ), $extra_refs ), $err );
	return $sig;
}
function new_order( $id, $total ) { $o = new Fake_Order( $id, $total ); $GLOBALS['wcp_orders'][ $id ] = $o; $r = gw()->process_payment( $id ); return array( $o, $r ); }

t( 'the gateway registers with WooCommerce', function () use ( $gateways ) { ok( in_array( 'WC_Gateway_Wen_Counter', $gateways, true ) ); } );
t( 'available only with a valid receiving address', function () use ( $SHOP ) { ok( gw()->is_available() ); $GLOBALS['wcp_settings']['recipient'] = 'not-an-address'; ok( ! gw()->is_available() ); $GLOBALS['wcp_settings']['recipient'] = $SHOP; } );
t( 'settings: a bad address is refused and cleared', function () { $g = gw(); $GLOBALS['wcp_post'] = array( 'recipient' => 'seed words are never typed here' ); $GLOBALS['wcp_errors'] = array(); $g->process_admin_options(); ok( '' === $g->get_option( 'recipient' ) ); ok( count( $GLOBALS['wcp_errors'] ) >= 1 ); } );
t( 'settings: mainnet needs the confirmation, otherwise back to devnet', function () use ( $SHOP ) { $g = gw(); $GLOBALS['wcp_post'] = array( 'recipient' => $SHOP, 'network' => 'mainnet', 'mainnet_ok' => 'no' ); $g->process_admin_options(); ok( 'devnet' === $g->get_option( 'network' ) ); ok( 'devnet' === $g->network() ); } );
t( 'settings: rate must be positive', function () use ( $SHOP ) { $g = gw(); $GLOBALS['wcp_post'] = array( 'recipient' => $SHOP, 'rate' => '0' ); $g->process_admin_options(); ok( '1' === $g->get_option( 'rate' ) ); } );
t( 'USDC on devnet uses the devnet test mint; on mainnet the real mint', function () use ( $USDC_DEV ) { ok( gw()->token()[0] === $USDC_DEV ); $GLOBALS['wcp_settings']['network'] = 'mainnet'; $GLOBALS['wcp_settings']['mainnet_ok'] = 'yes'; ok( gw()->token()[0] === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ); $GLOBALS['wcp_settings']['network'] = 'devnet'; $GLOBALS['wcp_settings']['mainnet_ok'] = 'no'; } );
t( 'placing an order: fresh reference, exact amount, memo, Solana Pay URL, cart emptied, redirect to order received', function () use ( $SHOP, $USDC_DEV ) {
	list( $o, $r ) = new_order( 101, '24.99' );
	ok( 'success' === $r['result'] ); ok( false !== strpos( $r['redirect'], 'order-received/101' ) );
	ok( WCP_Core::is_address( $o->get_meta( '_wcp_reference' ) ) ); ok( '24.99' === $o->get_meta( '_wcp_amount' ) ); ok( '24990000' === $o->get_meta( '_wcp_units' ) );
	ok( 0 === strpos( $o->get_meta( '_wcp_url' ), 'solana:' . $SHOP . '?amount=24.99&spl-token=' . $USDC_DEV . '&reference=' ) ); ok( false !== strpos( $o->get_meta( '_wcp_url' ), 'memo=order%3A101' ) );
	ok( WC()->cart->emptied ); ok( 'pending' === $o->status );
} );
t( 'two orders never share a reference', function () { list( $a ) = new_order( 102, '5' ); list( $b ) = new_order( 103, '5' ); ok( $a->get_meta( '_wcp_reference' ) !== $b->get_meta( '_wcp_reference' ) ); } );
t( 'no payment yet: waiting', function () { list( $o ) = new_order( 110, '10' ); ok( 'waiting' === gw()->check_order( $o ) ); ok( ! $o->is_paid() ); } );
t( 'exact payment: order paid, signature stored, explorer note', function () { list( $o ) = new_order( 111, '10' ); $sig = pay( $o, '10000000' ); ok( 'paid' === gw()->check_order( $o ) ); ok( $o->is_paid() ); ok( $sig === $o->txid ); ok( $sig === $o->get_meta( '_wcp_signature' ) ); ok( false !== strpos( end( $o->notes ), 'explorer.solana.com/tx/' ) ); } );
t( 'underpaid: not paid, note explains', function () { list( $o ) = new_order( 112, '10' ); pay( $o, '9999999' ); ok( 'mismatch' === gw()->check_order( $o ) ); ok( ! $o->is_paid() ); ok( false !== strpos( end( $o->notes ), 'expected 10000000' ) ); } );
t( 'wrong token: not paid', function () { list( $o ) = new_order( 113, '10' ); pay( $o, '10000000', 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk' ); ok( 'mismatch' === gw()->check_order( $o ) ); ok( ! $o->is_paid() ); } );
t( 'failed transaction: not paid', function () { list( $o ) = new_order( 114, '10' ); pay( $o, '10000000', null, array( 'InstructionError' => array( 0, 'x' ) ) ); ok( 'mismatch' === gw()->check_order( $o ) ); ok( ! $o->is_paid() ); } );
t( 'payment to another address: not paid', function () { list( $o ) = new_order( 115, '10' ); $sig = WCP_Core::b58encode( random_bytes( 64 ) ); $GLOBALS['chain']['refs'][ $o->get_meta( '_wcp_reference' ) ] = $sig; $GLOBALS['chain']['txs'][ $sig ] = spl_tx( WCP_Core::new_reference(), $o->get_meta( '_wcp_mint' ), 0, '10000000', array( $o->get_meta( '_wcp_reference' ) ) ); ok( 'mismatch' === gw()->check_order( $o ) ); ok( ! $o->is_paid() ); } );
t( 'one transaction pays one order (a second order in the same transaction is refused)', function () { list( $a ) = new_order( 116, '10' ); list( $b ) = new_order( 117, '10' ); pay( $a, '10000000', null, null, array( $b->get_meta( '_wcp_reference' ) ) ); ok( 'paid' === gw()->check_order( $a ) ); ok( 'mismatch' === gw()->check_order( $b ) ); ok( ! $b->is_paid() ); } );
t( 'REST status: wrong order key gets nothing', function () { list( $o ) = new_order( 120, '3' ); $r = wcp_rest_check( array( 'order' => 120, 'key' => 'wc_order_guess' ) ); ok( 404 === $r->status ); ok( 'unknown' === $r->data['status'] ); } );
t( 'REST status: waiting, then paid with an explorer link; checks are rate-limited', function () { list( $o ) = new_order( 121, '3' ); $GLOBALS['wcp_tr'] = array();
	$r = wcp_rest_check( array( 'order' => 121, 'key' => $o->get_order_key() ) ); ok( 'waiting' === $r->data['status'] ); pay( $o, '3000000' );
	$r = wcp_rest_check( array( 'order' => 121, 'key' => $o->get_order_key() ) ); ok( 'waiting' === $r->data['status'], 'second call inside 3 s must not hit the chain' );
	$GLOBALS['wcp_tr'] = array(); $r = wcp_rest_check( array( 'order' => 121, 'key' => $o->get_order_key() ) ); ok( 'paid' === $r->data['status'] ); ok( 0 === strpos( $r->data['tx'], 'https://explorer.solana.com/tx/' ) ); } );
t( 'background check pays an order whose tab was closed', function () { list( $o ) = new_order( 130, '7' ); pay( $o, '7000000' ); wcp_check_pending(); ok( $o->is_paid() ); } );
t( 'order received page: QR data, wallet link, short address; nothing unescaped', function () use ( $SHOP ) { list( $o ) = new_order( 140, '12.5' ); ob_start(); gw()->thankyou_page( 140 ); $h = ob_get_clean();
	ok( in_array( 'wcp-checkout', $GLOBALS['wcp_scripts'], true ) ); ok( $GLOBALS['wcp_loc']['url'] === $o->get_meta( '_wcp_url' ) ); ok( $GLOBALS['wcp_loc']['key'] === $o->get_order_key() );
	ok( false !== strpos( $h, 'href="solana:' ) ); ok( false !== strpos( $h, substr( $SHOP, 0, 5 ) . '…' . substr( $SHOP, -5 ) ) ); ok( false !== strpos( $h, 'devnet' ) ); ok( false === strpos( $h, '<script' ) ); } );
t( 'a shop name with HTML is shown as text, never as markup', function () { $GLOBALS['wcp_settings']['shop_label'] = '<img src=x onerror=alert(1)>'; list( $o ) = new_order( 141, '1' ); ob_start(); gw()->thankyou_page( 141 ); $h = ob_get_clean(); ok( false === strpos( $h, '<img' ) ); unset( $GLOBALS['wcp_settings']['shop_label'] ); } );
t( 'usability: a stray transaction with the same reference after the payment does not block the order', function () { list( $o ) = new_order( 150, '10' ); $good = pay( $o, '10000000' ); $ref = $o->get_meta( '_wcp_reference' ); $junk = WCP_Core::b58encode( random_bytes( 64 ) ); $GLOBALS['chain']['txs'][ $junk ] = spl_tx( WCP_Core::new_reference(), $o->get_meta( '_wcp_mint' ), 0, '1', array( $ref ) ); $GLOBALS['chain']['refs'][ $ref ] = array( $junk, $good ); ok( 'paid' === gw()->check_order( $o ) ); ok( $good === $o->txid ); } );
t( 'usability: paying again for the same order keeps the same reference and QR', function () { list( $o ) = new_order( 151, '8' ); $ref = $o->get_meta( '_wcp_reference' ); $url = $o->get_meta( '_wcp_url' ); gw()->process_payment( 151 ); ok( $ref === $o->get_meta( '_wcp_reference' ) ); ok( $url === $o->get_meta( '_wcp_url' ) ); } );
t( 'usability: WooCommerce does not auto-cancel our unpaid order within 24 hours, other orders untouched', function () { list( $o ) = new_order( 152, '4' ); ok( false === wcp_keep_unpaid_order( true, $o ) ); $o->created = time() - 2 * DAY_IN_SECONDS; ok( true === wcp_keep_unpaid_order( true, $o ) ); $other = new Fake_Order( 153, '4' ); $other->method = 'cod'; ok( true === wcp_keep_unpaid_order( true, $other ) ); } );
t( 'usability: the buyer gets an email with the way back to the payment page, nothing about keys asked', function () { $GLOBALS['wcp_mail'] = array(); list( $o ) = new_order( 154, '6' ); ok( 1 === count( $GLOBALS['wcp_mail'] ) ); list( $to, $subj, $msg ) = $GLOBALS['wcp_mail'][0]; ok( 'buyer@example.com' === $to ); ok( false !== strpos( $subj, '#154' ) ); ok( false !== strpos( $msg, 'order-received/154/?key=' . $o->get_order_key() ) ); ok( false !== strpos( $msg, 'exchange' ) ); ok( false === stripos( $msg, 'enter your seed' ) ); $GLOBALS['wcp_settings']['pay_email'] = 'no'; $GLOBALS['wcp_mail'] = array(); new_order( 155, '6' ); ok( 0 === count( $GLOBALS['wcp_mail'] ) ); unset( $GLOBALS['wcp_settings']['pay_email'] ); } );
t( 'usability: the order page says to pay from a wallet app, not by manual transfer or exchange withdrawal', function () { list( $o ) = new_order( 156, '2' ); ob_start(); gw()->thankyou_page( 156 ); $h = ob_get_clean(); ok( false !== strpos( $h, 'exchange withdrawal' ) ); ok( false !== strpos( $h, 'wcp-hint' ) ); } );
t( 'only the three read methods ever reached the chain', function () { $used = array_unique( $GLOBALS['chain']['calls'] ); foreach ( $used as $m ) { ok( in_array( $m, WCP_RPC::READ_ONLY, true ), $m ); } } );
t( 'the RPC client blocks anything that is not a read', function () { $rpc = new WCP_RPC( 'devnet', '', WC_Gateway_Wen_Counter::$transport ); foreach ( array( 'sendTransaction', 'requestAirdrop', 'simulateTransaction' ) as $m ) { $blocked = false; try { $rpc->call( $m, array() ); } catch ( RuntimeException $e ) { $blocked = true; } ok( $blocked, $m ); } } );
echo "\n{$n} checks passed" . ( $fail ? ", {$fail} FAILED" : '' ) . "\n";
exit( $fail ? 1 : 0 );
