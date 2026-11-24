<?php
/**
 * Wen Counter Pay · core parity tests: the PHP port must give the same answers as the WCP-1 JavaScript core.
 * Fixtures come from tests/make-fixtures.js (lab/counter/counter-core.js). Run: php tests/test-core.php · Apache-2.0
 */
define( 'ABSPATH', __DIR__ );
require __DIR__ . '/../includes/class-wcp-core.php';
$n = 0; $fail = 0;
function t( $name, $f ) { global $n, $fail; try { $f(); $n++; echo "ok $name\n"; } catch ( Throwable $e ) { $fail++; echo "FAIL $name: " . $e->getMessage() . "\n"; } }
function eq( $a, $b, $m = '' ) { if ( $a !== $b ) { throw new Exception( $m . ' expected ' . var_export( $b, true ) . ' got ' . var_export( $a, true ) ); } }
function throws( $f ) { try { $f(); } catch ( Throwable $e ) { return; } throw new Exception( 'expected an exception' ); }
$F = json_decode( file_get_contents( __DIR__ . '/fixtures.json' ), true );

t( 'base58 encode and decode match the JS core (60 vectors, leading zeros included)', function () use ( $F ) {
	foreach ( $F['b58'] as $v ) { eq( WCP_Core::b58encode( hex2bin( $v['hex'] ) ), $v['b58'] ); eq( bin2hex( WCP_Core::b58decode( $v['b58'] ) ), $v['hex'] ); }
} );
t( 'addresses: 32 bytes only; signatures: 64 bytes only', function () {
	eq( WCP_Core::is_address( 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk' ), true ); eq( WCP_Core::is_address( '11111111111111111111111111111111' ), true );
	eq( WCP_Core::is_address( 'hello' ), false ); eq( WCP_Core::is_address( '0OIl' ), false ); eq( WCP_Core::is_address( '' ), false );
	eq( WCP_Core::is_signature( WCP_Core::b58encode( random_bytes( 64 ) ) ), true ); eq( WCP_Core::is_signature( 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk' ), false );
} );
t( 'a new reference is always a fresh valid address', function () { $seen = array(); for ( $i = 0; $i < 200; $i++ ) { $r = WCP_Core::new_reference(); eq( WCP_Core::is_address( $r ), true ); eq( isset( $seen[ $r ] ), false ); $seen[ $r ] = 1; } } );
t( 'base units match the JS core', function () use ( $F ) { foreach ( $F['units'] as $u ) { eq( WCP_Core::to_base_units( $u['amount'], $u['decimals'] ), $u['out'] ); } } );
t( 'base units refuse bad input', function () { throws( function () { WCP_Core::to_base_units( '0', 6 ); } ); throws( function () { WCP_Core::to_base_units( '1.1234567', 6 ); } ); throws( function () { WCP_Core::to_base_units( '-1', 6 ); } ); throws( function () { WCP_Core::to_base_units( '1e3', 6 ); } ); throws( function () { WCP_Core::to_base_units( '12,5', 6 ); } ); } );
t( 'from base units back to a decimal string', function () { eq( WCP_Core::from_base_units( '24990000', 6 ), '24.99' ); eq( WCP_Core::from_base_units( '1', 6 ), '0.000001' ); eq( WCP_Core::from_base_units( '100000', 5 ), '1' ); eq( WCP_Core::from_base_units( '0', 6 ), '0' ); } );
t( 'order total x rate is rounded UP to the token decimals, never down', function () {
	eq( WCP_Core::token_amount( '24.99', '1', 6 ), '24.99' ); eq( WCP_Core::token_amount( '10', '0.3333333', 6 ), '3.333333' ); eq( WCP_Core::token_amount( '10', '0.33333334', 6 ), '3.333334' );
	eq( WCP_Core::token_amount( '19.90', '2.5', 6 ), '49.75' ); eq( WCP_Core::token_amount( '1', '12345.678901', 5 ), '12345.67891' );
	eq( WCP_Core::token_amount( '0.01', '0.00000001', 6 ), '0.000001' ); eq( WCP_Core::token_amount( '999999.99', '1', 6 ), '999999.99' );
	throws( function () { WCP_Core::token_amount( '0', '1', 6 ); } ); throws( function () { WCP_Core::token_amount( '5', 'abc', 6 ); } );
} );
t( 'Solana Pay URL is byte-for-byte the same as the JS core (3 cases, unicode and symbols)', function () use ( $F ) {
	foreach ( $F['urls'] as $u ) { $i = $u['in']; eq( WCP_Core::build_pay_url( $i['recipient'], $i['amount'], $i['splToken'], $i['reference'], $i['label'], $i['message'], $i['memo'] ), $u['out'] ); }
} );
t( 'Solana Pay URL refuses a bad recipient, mint or reference', function () use ( $F ) { $s = $F['shop']; $r = $F['ref'];
	throws( function () use ( $r ) { WCP_Core::build_pay_url( 'nope', '1', null, $r ); } ); throws( function () use ( $s, $r ) { WCP_Core::build_pay_url( $s, '1', 'bad-mint', $r ); } ); throws( function () use ( $s ) { WCP_Core::build_pay_url( $s, '1', null, 'x' ); } ); } );
t( 'memo is the same as the JS core: one line, at most 120 characters', function () use ( $F ) { foreach ( $F['memos'] as $m ) { eq( WCP_Core::build_memo( $m['order'], $m['comment'] ), $m['out'] ); } } );
t( 'five-point check gives the same verdict and amount as the JS core (10 transactions)', function () use ( $F ) {
	foreach ( $F['cases'] as $c ) { $r = WCP_Core::verify_payment( $c['tx'], $F['shop'], $F['ref'], $c['mint'], $c['expected'] ); eq( $r['ok'], $c['ok'], $c['name'] . ' ok' ); eq( $r['received'], $c['received'], $c['name'] . ' received' ); eq( $r['fee'], $c['fee'], $c['name'] . ' fee' ); }
} );
t( 'integer string compare', function () { eq( WCP_Core::cmp( '10', '9' ), 1 ); eq( WCP_Core::cmp( '0009', '9' ), 0 ); eq( WCP_Core::cmp( '123', '124' ), -1 ); } );
echo "\n{$n} checks passed" . ( $fail ? ", {$fail} FAILED" : '' ) . "\n";
exit( $fail ? 1 : 0 );
