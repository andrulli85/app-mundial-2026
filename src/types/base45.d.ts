declare module "base45" {
  /**
   * Encode a Uint8Array or Buffer to a base45 string (QR alphanumeric charset).
   */
  function encode(input: Uint8Array | Buffer): string;

  /**
   * Decode a base45 string to a Uint8Array (Node.js Buffer subclass).
   */
  function decode(input: string): Uint8Array;

  export { encode, decode };
}
