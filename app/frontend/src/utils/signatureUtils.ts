import * as secp256k1 from 'noble-secp256k1';

export function convertToTaprootSignature(signature: string): string {
  console.log('Converting BIP322 signature:', signature);
  
  try {
    // Decode the base64 witness data
    const witnessBytes = Buffer.from(signature, 'base64');
    console.log('Witness bytes length:', witnessBytes.length);
    console.log('Witness bytes:', witnessBytes.toString('hex'));
    
    // The witness format for BIP322-simple contains:
    // [witness_count][size][witness_stack_item]...
    let offset = 0;
    const witnessCount = witnessBytes[offset++];
    console.log('Witness count:', witnessCount);
    
    // Skip the first witness element
    const firstSize = witnessBytes[offset++];
    offset += firstSize;
    
    // Get the signature from the second witness element
    const sigSize = witnessBytes[offset++];
    console.log('Signature size:', sigSize);
    
    // Extract the witness script
    const witnessScript = witnessBytes.slice(offset, offset + sigSize);
    console.log('Witness script:', witnessScript.toString('hex'));
    
    // The signature should be 64 bytes starting at offset 3
    // (skipping the initial marker bytes)
    const schnorrSig = witnessScript.slice(3, 67);
    console.log('Schnorr signature length:', schnorrSig.length);
    console.log('Schnorr signature hex:', schnorrSig.toString('hex'));
    
    if (schnorrSig.length !== 64) {
      throw new Error(`Invalid Schnorr signature length: ${schnorrSig.length}`);
    }
    
    // Return base64 encoded signature
    const base64Sig = schnorrSig.toString('base64');
    console.log('Final base64 signature:', base64Sig);
    return base64Sig;
  } catch (error) {
    console.error('Error converting signature:', error);
    throw new Error(`Failed to convert BIP322 signature: ${error.message}`);
  }
}
