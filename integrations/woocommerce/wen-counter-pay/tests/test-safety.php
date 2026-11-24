<?php
/**
 * Wen Counter Pay · safety checks by reading the code: receive-only, read-only, no keys, no remote code, escaped output.
 * Run: php tests/test-safety.php · Apache-2.0
 */
$root = dirname( __DIR__ );
$n = 0; $fail = 0;
function t( $name, $f ) { global $n, $fail; try { $f(); $n++; echo "ok $name\n"; } catch ( Throwable $e ) { $fail++; echo "FAIL $name: " . $e->getMessage() . "\n"; } }
function ok( $c, $m = 'assertion failed' ) { if ( ! $c ) { throw new Exception( $m ); } }
function src( $p ) { global $root; return file_get_contents( $root . '/' . $p ); }
function strip_comments( $code ) { return preg_replace( '#/\*.*?\*/|//[^\n]*#s', '', $code ); }
$php = array( 'wen-counter-pay.php', 'includes/class-wcp-core.php', 'includes/class-wcp-rpc.php', 'includes/class-wc-gateway-wen-counter.php', 'includes/class-wcp-blocks.php' );
$js  = array( 'assets/wcp-checkout.js', 'assets/wcp-blocks.js' );
$all = array(); foreach ( array_merge( $php, $js ) as $f ) { $all[ $f ] = strip_comments( src( $f ) ); }

t( 'no signing or sending anywhere: no sendTransaction, signTransaction, signMessage, requestAirdrop', function () use ( $all ) { foreach ( $all as $f => $c ) { ok( ! preg_match( '/sendTransaction|signTransaction|signAllTransactions|signMessage|requestAirdrop|sendRawTransaction/i', $c ), $f ); } } );
t( 'no keys: no Keypair, secretKey, privateKey, mnemonic, seed phrase handling in code', function () use ( $all ) { foreach ( $all as $f => $c ) { ok( ! preg_match( '/Keypair|secretKey|secret_key|privateKey|private_key|mnemonic|fromSeed|bip39/i', $c ), $f ); } } );
t( 'no wallet connection: no window.solana, phantom, solflare, backpack, wallet adapter', function () use ( $all, $js ) { foreach ( $js as $f ) { ok( ! preg_match( '/window\.(solana|phantom|solflare|backpack)|wallet-adapter|\.connect\(/i', $all[ $f ] ), $f ); } } );
t( 'the RPC allow-list is exactly the three read methods', function () { $c = src( 'includes/class-wcp-rpc.php' ); ok( preg_match( "/const READ_ONLY = array\( 'getSignaturesForAddress', 'getTransaction', 'getAccountInfo' \);/", $c ) ); ok( false !== strpos( $c, "in_array( \$method, self::READ_ONLY, true )" ) ); } );
t( 'only the RPC client talks to the network, and only over https', function () use ( $all ) { foreach ( $all as $f => $c ) { if ( 'includes/class-wcp-rpc.php' === $f ) { continue; } ok( ! preg_match( '/wp_remote_|curl_|file_get_contents\(\s*[\'"]http/i', $c ), $f ); } ok( false !== strpos( src( 'includes/class-wcp-rpc.php' ), "0 === strpos( \$custom_url, 'https://' )" ) ); } );
t( 'scripts load from the plugin folder only; no remote code', function () use ( $all, $js ) { ok( ! preg_match( "/wp_(register|enqueue)_script\(\s*'[^']+',\s*'https?:/", $all['wen-counter-pay.php'] . $all['includes/class-wcp-blocks.php'] ) ); foreach ( $js as $f ) { ok( ! preg_match( '/\beval\(|new Function|import\(|document\.write|addEventListener\(\s*[\'"]message/', $all[ $f ] ), $f ); } } );
t( 'the page writes HTML only for the local QR image; links from the server are checked before use', function () use ( $all ) { $c = $all['assets/wcp-checkout.js']; ok( 1 === substr_count( $c, 'innerHTML' ) ); ok( false !== strpos( $c, 'innerHTML = q.createSvgTag' ) ); ok( false !== strpos( src( 'assets/wcp-checkout.js' ), '/^https:\/\/explorer\.solana\.com\/tx\//.test(d.tx)' ) ); ok( false !== strpos( $c, 'textContent' ) ); } );
t( 'every echo of a value is escaped', function () { $c = strip_comments( src( 'includes/class-wc-gateway-wen-counter.php' ) ); foreach ( explode( "\n", $c ) as $line ) { if ( preg_match( '/^\s*echo /', $line ) && false !== strpos( $line, '$' ) ) { ok( preg_match( '/esc_(html|attr|url)/', $line ), trim( $line ) ); } } } );
t( 'the status endpoint checks the order key with a constant-time compare and is rate-limited', function () { $c = src( 'wen-counter-pay.php' ); ok( false !== strpos( $c, "hash_equals( (string) \$order->get_order_key(), (string) \$request['key'] )" ) ); ok( false !== strpos( $c, "set_transient( \$lock, 1, 3 )" ) ); ok( false !== strpos( $c, "'methods'             => 'GET'" ) ); } );
t( 'an order is marked paid only after the five-point check, and one transaction pays one order', function () { $c = src( 'includes/class-wc-gateway-wen-counter.php' ); $v = strpos( $c, 'WCP_Core::verify_payment(' ); $d = strpos( $c, "'meta_key' => '_wcp_signature'" ); $p = strpos( $c, '$order->payment_complete( $sig )' ); ok( $v && $d && $p && $v < $p && $d < $p ); } );
t( 'settings refuse a non-address and keep devnet until mainnet is confirmed', function () { $c = src( 'includes/class-wc-gateway-wen-counter.php' ); ok( false !== strpos( $c, "! WCP_Core::is_address( \$recipient )" ) ); ok( false !== strpos( $c, "\$this->update_option( 'network', 'devnet' )" ) ); ok( false !== strpos( $c, "'default' => 'devnet'" ) ); } );
t( 'the QR generator is the same file as in the Wen Counter (MIT)', function () use ( $root ) { $lab = $root . '/../../../lab/counter/qrcode.js'; if ( ! file_exists( $lab ) ) { echo "  (Wen Counter not next to the plugin; skipped)\n"; return; } ok( hash_file( 'sha256', $root . '/assets/qrcode.js' ) === hash_file( 'sha256', $lab ) ); } );
t( 'license and attribution: Apache-2.0 headers, LICENSE and NOTICE present, NOTICE names the Wen chain', function () use ( $root, $php, $js ) { foreach ( array_merge( $php, $js ) as $f ) { ok( false !== stripos( src( $f ), 'Apache-2.0' ), $f ); } ok( file_exists( $root . '/LICENSE' ) ); $no = src( 'NOTICE' ); ok( false !== strpos( $no, 'Wen Counter (WCP-1)' ) ); ok( false !== strpos( $no, 'wen-watt.github.io' ) ); } );
t( 'all PHP files parse', function () use ( $root, $php ) { foreach ( $php as $f ) { exec( 'php -l ' . escapeshellarg( $root . '/' . $f ) . ' 2>&1', $o, $code ); ok( 0 === $code, $f ); } } );
echo "\n{$n} checks passed" . ( $fail ? ", {$fail} FAILED" : '' ) . "\n";
exit( $fail ? 1 : 0 );
