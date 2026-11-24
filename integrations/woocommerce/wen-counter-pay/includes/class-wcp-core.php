<?php
/**
 * Wen Counter Pay · core (PHP port of the WCP-1 pure functions in lab/counter/counter-core.js)
 * Wen Counter Protocol 1.0 (WCP-1): receive-only, read-only, five-point check, wallet as identity.
 * No WordPress calls in this file, so it can be tested with plain PHP.
 * License: Apache-2.0. Example code, not audited. Devnet first.
 */

if ( ! defined( 'WCP_CORE_LOADED' ) ) {
	define( 'WCP_CORE_LOADED', true );
}

final class WCP_Core {

	const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

	/** Known tokens: mint and decimals. Decimals of a custom mint are read from the chain. */
	const TOKENS = array(
		'usdc-devnet'  => array( 'label' => 'USDC (devnet)', 'mint' => '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', 'decimals' => 6, 'net' => 'devnet' ),
		'usdc-mainnet' => array( 'label' => 'USDC', 'mint' => 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'decimals' => 6, 'net' => 'mainnet' ),
		'sol'          => array( 'label' => 'SOL', 'mint' => null, 'decimals' => 9, 'net' => 'any' ),
		'wen'          => array( 'label' => 'WEN', 'mint' => 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk', 'decimals' => 5, 'net' => 'mainnet' ),
		'jup'          => array( 'label' => 'JUP', 'mint' => 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', 'decimals' => 6, 'net' => 'mainnet' ),
		'usdt'         => array( 'label' => 'USDT', 'mint' => 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'decimals' => 6, 'net' => 'mainnet' ),
	);

	/** Base58 encode a byte string. */
	public static function b58encode( $bytes ) {
		$len   = strlen( $bytes );
		$zeros = 0;
		while ( $zeros < $len && "\0" === $bytes[ $zeros ] ) {
			$zeros++;
		}
		$digits = array(); // little-endian base-58 digits
		for ( $i = $zeros; $i < $len; $i++ ) {
			$carry = ord( $bytes[ $i ] );
			$n     = count( $digits );
			for ( $j = 0; $j < $n; $j++ ) {
				$carry       += $digits[ $j ] << 8;
				$digits[ $j ] = $carry % 58;
				$carry        = intdiv( $carry, 58 );
			}
			while ( $carry > 0 ) {
				$digits[] = $carry % 58;
				$carry    = intdiv( $carry, 58 );
			}
		}
		$out = str_repeat( '1', $zeros );
		for ( $k = count( $digits ) - 1; $k >= 0; $k-- ) {
			$out .= self::ALPHABET[ $digits[ $k ] ];
		}
		return $out;
	}

	/** Base58 decode to a byte string, or null if the string is not base58. */
	public static function b58decode( $str ) {
		if ( ! is_string( $str ) || '' === $str ) {
			return null;
		}
		$bytes = array(); // little-endian base-256
		$len   = strlen( $str );
		for ( $i = 0; $i < $len; $i++ ) {
			$v = strpos( self::ALPHABET, $str[ $i ] );
			if ( false === $v ) {
				return null;
			}
			$carry = $v;
			$n     = count( $bytes );
			for ( $j = 0; $j < $n; $j++ ) {
				$carry      += $bytes[ $j ] * 58;
				$bytes[ $j ] = $carry & 0xff;
				$carry     >>= 8;
			}
			while ( $carry > 0 ) {
				$bytes[] = $carry & 0xff;
				$carry >>= 8;
			}
		}
		$zeros = 0;
		while ( $zeros < $len && '1' === $str[ $zeros ] ) {
			$zeros++;
		}
		$out = str_repeat( "\0", $zeros );
		for ( $k = count( $bytes ) - 1; $k >= 0; $k-- ) {
			$out .= chr( $bytes[ $k ] );
		}
		return $out;
	}

	/** A Solana address is 32 bytes in base58. Shape check only. */
	public static function is_address( $str ) {
		$b = self::b58decode( $str );
		return null !== $b && 32 === strlen( $b );
	}

	/** A transaction signature is 64 bytes in base58. */
	public static function is_signature( $str ) {
		$b = self::b58decode( $str );
		return null !== $b && 64 === strlen( $b );
	}

	/** A fresh, never-reused reference key for one order (32 random bytes, base58). */
	public static function new_reference() {
		return self::b58encode( random_bytes( 32 ) );
	}

	/**
	 * "24.99" -> "24990000" (string, base units) for 6 decimals. Throws on bad input or too many decimals.
	 * Strings keep large amounts exact on any PHP build.
	 */
	public static function to_base_units( $amount, $decimals ) {
		$s = trim( (string) $amount );
		if ( ! preg_match( '/^\d+(\.\d+)?$/', $s ) ) {
			throw new InvalidArgumentException( 'Amount must be a positive number like 12.50' );
		}
		$parts = explode( '.', $s );
		$whole = $parts[0];
		$frac  = isset( $parts[1] ) ? $parts[1] : '';
		if ( strlen( $frac ) > $decimals ) {
			throw new InvalidArgumentException( "At most {$decimals} decimal places for this token" );
		}
		$v = ltrim( $whole . str_pad( $frac, $decimals, '0' ), '0' );
		if ( '' === $v ) {
			throw new InvalidArgumentException( 'Amount must be greater than zero' );
		}
		return $v;
	}

	/** Base units back to a decimal string: ("24990000", 6) -> "24.99". */
	public static function from_base_units( $units, $decimals ) {
		$u = ltrim( (string) $units, '0' );
		if ( '' === $u ) {
			return '0';
		}
		if ( 0 === (int) $decimals ) {
			return $u;
		}
		$u     = str_pad( $u, $decimals + 1, '0', STR_PAD_LEFT );
		$whole = substr( $u, 0, -$decimals );
		$frac  = rtrim( substr( $u, -$decimals ), '0' );
		return '' === $frac ? $whole : $whole . '.' . $frac;
	}

	/**
	 * Order total in the shop currency x rate (tokens per one currency unit) -> token amount string,
	 * rounded UP to the token's decimals, so the shop never receives less than the order total.
	 */
	public static function token_amount( $total, $rate, $decimals ) {
		$t = trim( (string) $total );
		$r = trim( (string) $rate );
		if ( ! preg_match( '/^\d+(\.\d+)?$/', $t ) || ! preg_match( '/^\d+(\.\d+)?$/', $r ) ) {
			throw new InvalidArgumentException( 'Total and rate must be positive numbers' );
		}
		// Exact integer arithmetic on scaled strings.
		list( $ti, $ts ) = self::scaled( $t );
		list( $ri, $rs ) = self::scaled( $r );
		$prod  = self::mul( $ti, $ri );   // value = prod / 10^(ts+rs)
		$scale = $ts + $rs;
		if ( $scale <= $decimals ) {
			$units = $prod . str_repeat( '0', $decimals - $scale );
		} else {
			$cut   = $scale - $decimals;
			$head  = strlen( $prod ) > $cut ? substr( $prod, 0, -$cut ) : '0';
			$tail  = strlen( $prod ) > $cut ? substr( $prod, -$cut ) : str_pad( $prod, $cut, '0', STR_PAD_LEFT );
			$units = self::add_one_if( $head, trim( $tail, '0' ) !== '' );
		}
		$units = ltrim( $units, '0' );
		if ( '' === $units ) {
			throw new InvalidArgumentException( 'Amount must be greater than zero' );
		}
		return self::from_base_units( $units, $decimals );
	}

	private static function scaled( $s ) {
		$p = explode( '.', $s );
		$f = isset( $p[1] ) ? $p[1] : '';
		$i = ltrim( $p[0] . $f, '0' );
		return array( '' === $i ? '0' : $i, strlen( $f ) );
	}

	/** Multiply two non-negative integer strings. */
	private static function mul( $a, $b ) {
		$a   = strrev( $a );
		$b   = strrev( $b );
		$res = array_fill( 0, strlen( $a ) + strlen( $b ), 0 );
		for ( $i = 0, $la = strlen( $a ); $i < $la; $i++ ) {
			for ( $j = 0, $lb = strlen( $b ); $j < $lb; $j++ ) {
				$res[ $i + $j ] += ( (int) $a[ $i ] ) * ( (int) $b[ $j ] );
			}
		}
		$carry = 0;
		foreach ( $res as $k => $v ) {
			$v         += $carry;
			$res[ $k ]  = $v % 10;
			$carry      = intdiv( $v, 10 );
		}
		while ( $carry > 0 ) {
			$res[] = $carry % 10;
			$carry = intdiv( $carry, 10 );
		}
		$out = ltrim( strrev( implode( '', $res ) ), '0' );
		return '' === $out ? '0' : $out;
	}

	private static function add_one_if( $n, $cond ) {
		if ( ! $cond ) {
			return $n;
		}
		$d = str_split( strrev( $n ) );
		$i = 0;
		while ( true ) {
			if ( ! isset( $d[ $i ] ) ) {
				$d[ $i ] = '1';
				break;
			}
			if ( '9' === $d[ $i ] ) {
				$d[ $i ] = '0';
				$i++;
				continue;
			}
			$d[ $i ] = (string) ( (int) $d[ $i ] + 1 );
			break;
		}
		return strrev( implode( '', $d ) );
	}

	/** Compare two non-negative integer strings: -1, 0, 1. */
	public static function cmp( $a, $b ) {
		$a = ltrim( (string) $a, '0' );
		$b = ltrim( (string) $b, '0' );
		if ( strlen( $a ) !== strlen( $b ) ) {
			return strlen( $a ) < strlen( $b ) ? -1 : 1;
		}
		return $a === $b ? 0 : ( strcmp( $a, $b ) < 0 ? -1 : 1 );
	}

	/** b - a for integer strings that may be negative in the result; returns a signed integer string. */
	public static function diff( $post, $pre ) {
		$post = (string) $post;
		$pre  = (string) $pre;
		if ( function_exists( 'bcsub' ) ) {
			return bcsub( $post, $pre, 0 );
		}
		if ( PHP_INT_SIZE >= 8 && strlen( $post ) < 19 && strlen( $pre ) < 19 ) {
			return (string) ( (int) $post - (int) $pre );
		}
		throw new RuntimeException( 'Amount too large for this PHP build (install bcmath)' );
	}

	/** Solana Pay transfer request URL, same as buildPayURL in counter-core.js. */
	public static function build_pay_url( $recipient, $amount, $spl_token, $reference, $label = '', $message = '', $memo = '' ) {
		if ( ! self::is_address( $recipient ) ) {
			throw new InvalidArgumentException( 'Recipient is not a Solana address' );
		}
		if ( $spl_token && ! self::is_address( $spl_token ) ) {
			throw new InvalidArgumentException( 'Token mint is not a Solana address' );
		}
		if ( ! self::is_address( $reference ) ) {
			throw new InvalidArgumentException( 'Reference is not a Solana address' );
		}
		$q = array( array( 'amount', trim( (string) $amount ) ) );
		if ( $spl_token ) {
			$q[] = array( 'spl-token', $spl_token );
		}
		$q[] = array( 'reference', $reference );
		if ( '' !== (string) $label ) {
			$q[] = array( 'label', $label );
		}
		if ( '' !== (string) $message ) {
			$q[] = array( 'message', $message );
		}
		if ( '' !== (string) $memo ) {
			$q[] = array( 'memo', $memo );
		}
		$pairs = array();
		foreach ( $q as $kv ) {
			$pairs[] = $kv[0] . '=' . self::encode_uri_component( $kv[1] );
		}
		return 'solana:' . $recipient . '?' . implode( '&', $pairs );
	}

	/** JavaScript encodeURIComponent: keeps A-Z a-z 0-9 - _ . ! ~ * ' ( ). */
	public static function encode_uri_component( $s ) {
		return strtr( rawurlencode( (string) $s ), array( '%21' => '!', '%2A' => '*', '%27' => "'", '%28' => '(', '%29' => ')' ) );
	}

	/** Memo for an order, same as buildMemo in counter-core.js: "order:<id>[ · comment]", one line, at most 120 characters. */
	public static function build_memo( $order_id, $comment = '' ) {
		$c = preg_replace( '/\s+/u', ' ', preg_replace( '/[\r\n\t]+/', ' ', (string) $comment ) );
		$c = trim( $c );
		$m = 'order:' . $order_id . ( '' !== $c ? ' · ' . $c : '' );
		if ( mb_strlen( $m, 'UTF-8' ) > 120 ) {
			$m = mb_substr( $m, 0, 119, 'UTF-8' ) . '…';
		}
		return $m;
	}

	/**
	 * Validate a confirmed transaction (getTransaction, encoding jsonParsed, decoded as arrays)
	 * against the order: reference, recipient, token, amount, success. Same rules as verifyPayment.
	 * Returns array( ok, received (string base units), fee (string lamports), reasons[] ).
	 */
	public static function verify_payment( $tx, $recipient, $reference, $spl_token, $expected ) {
		$reasons = array();
		if ( ! is_array( $tx ) || empty( $tx['meta'] ) || empty( $tx['transaction'] ) ) {
			return array( 'ok' => false, 'received' => '0', 'fee' => '0', 'reasons' => array( 'Transaction not found' ) );
		}
		$meta = $tx['meta'];
		if ( ! empty( $meta['err'] ) ) {
			$reasons[] = 'Transaction failed on-chain';
		}
		$keys = array();
		foreach ( (array) $tx['transaction']['message']['accountKeys'] as $k ) {
			$keys[] = is_array( $k ) ? (string) $k['pubkey'] : (string) $k;
		}
		if ( ! in_array( $reference, $keys, true ) ) {
			$reasons[] = 'Reference key is not in the transaction';
		}
		$received = '0';
		if ( $spl_token ) {
			$sum = function ( $arr ) use ( $recipient, $spl_token ) {
				$t = '0';
				foreach ( (array) $arr as $b ) {
					if ( isset( $b['owner'], $b['mint'] ) && $b['owner'] === $recipient && $b['mint'] === $spl_token ) {
						$t = self::diff( $t, '-' . $b['uiTokenAmount']['amount'] );
					}
				}
				return $t;
			};
			$received = self::diff( $sum( isset( $meta['postTokenBalances'] ) ? $meta['postTokenBalances'] : array() ), $sum( isset( $meta['preTokenBalances'] ) ? $meta['preTokenBalances'] : array() ) );
		} else {
			$i = array_search( $recipient, $keys, true );
			if ( false === $i ) {
				$reasons[] = 'Recipient is not in the transaction';
			} else {
				$received = self::diff( (string) $meta['postBalances'][ $i ], (string) $meta['preBalances'][ $i ] );
			}
		}
		$neg = '-' === substr( $received, 0, 1 );
		if ( $neg || self::cmp( $received, $expected ) < 0 ) {
			$reasons[] = "Received {$received} base units, expected {$expected}";
		}
		return array(
			'ok'       => 0 === count( $reasons ),
			'received' => $received,
			'fee'      => (string) ( isset( $meta['fee'] ) ? $meta['fee'] : 0 ),
			'reasons'  => $reasons,
		);
	}
}
