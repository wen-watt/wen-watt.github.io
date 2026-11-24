<?php
/**
 * Wen Counter Pay · read-only Solana RPC client.
 * Exactly three read methods are allowed, as in the WCP-1 counter. Nothing can sign or send.
 * License: Apache-2.0.
 */

defined( 'ABSPATH' ) || exit;

final class WCP_RPC {

	/** The only methods this plugin may call. Anything else is blocked before a request is made. */
	const READ_ONLY = array( 'getSignaturesForAddress', 'getTransaction', 'getAccountInfo' );

	const ENDPOINTS = array(
		'devnet'  => 'https://api.devnet.solana.com',
		'mainnet' => 'https://api.mainnet-beta.solana.com',
	);

	/** @var string */
	private $url;

	/** @var callable|null test hook: function( $method, $params ) returning the decoded result */
	private $transport;

	public function __construct( $network, $custom_url = '', $transport = null ) {
		$custom_url      = trim( (string) $custom_url );
		$this->url       = ( '' !== $custom_url && 0 === strpos( $custom_url, 'https://' ) ) ? $custom_url : ( isset( self::ENDPOINTS[ $network ] ) ? self::ENDPOINTS[ $network ] : self::ENDPOINTS['devnet'] );
		$this->transport = $transport;
	}

	public function url() {
		return $this->url;
	}

	/** One JSON-RPC call. Returns the decoded "result" or throws. */
	public function call( $method, array $params ) {
		if ( ! in_array( $method, self::READ_ONLY, true ) ) {
			throw new RuntimeException( 'Blocked: Wen Counter Pay only reads the chain' );
		}
		if ( $this->transport ) {
			return call_user_func( $this->transport, $method, $params );
		}
		$res = wp_remote_post(
			$this->url,
			array(
				'timeout' => 12,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( array( 'jsonrpc' => '2.0', 'id' => 1, 'method' => $method, 'params' => $params ) ),
			)
		);
		if ( is_wp_error( $res ) ) {
			throw new RuntimeException( 'RPC request failed: ' . $res->get_error_message() );
		}
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( ! is_array( $body ) ) {
			throw new RuntimeException( 'RPC answer is not JSON' );
		}
		if ( isset( $body['error'] ) ) {
			throw new RuntimeException( 'RPC error: ' . ( isset( $body['error']['message'] ) ? $body['error']['message'] : 'unknown' ) );
		}
		return isset( $body['result'] ) ? $body['result'] : null;
	}

	/** Newest signature that mentions the reference key, or null. */
	public function find_reference( $reference ) {
		$sigs = $this->call( 'getSignaturesForAddress', array( $reference, array( 'limit' => 1, 'commitment' => 'confirmed' ) ) );
		return ( is_array( $sigs ) && isset( $sigs[0]['signature'] ) ) ? (string) $sigs[0]['signature'] : null;
	}

	public function get_transaction( $signature ) {
		return $this->call( 'getTransaction', array( $signature, array( 'encoding' => 'jsonParsed', 'commitment' => 'confirmed', 'maxSupportedTransactionVersion' => 0 ) ) );
	}

	/** Decimals of a token mint, read from the chain (jsonParsed). */
	public function mint_decimals( $mint ) {
		$r = $this->call( 'getAccountInfo', array( $mint, array( 'encoding' => 'jsonParsed', 'commitment' => 'confirmed' ) ) );
		if ( isset( $r['value']['data']['parsed']['info']['decimals'] ) ) {
			return (int) $r['value']['data']['parsed']['info']['decimals'];
		}
		throw new RuntimeException( 'Not a token mint: ' . $mint );
	}
}
