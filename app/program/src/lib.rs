use arch_program::{
    account::AccountInfo,
    entrypoint,
    msg,
    program::next_account_info,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use arch_program::program::get_clock;
use borsh::{BorshSerialize, BorshDeserialize};

// Add the entrypoint macro to define our program's entry point
entrypoint!(process_instruction);

// Define a custom error type
pub enum GraffitiError {
    WallFull,
    AccountTooSmall,
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct GraffitiWallParams {
    pub name: [u8; 64],
    pub message: [u8; 64],
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct GraffitiMessage {
    pub timestamp: i64,
    pub name: [u8; 64],
    pub message: [u8; 64],
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize)]
pub struct GraffitiWallHeader {
    pub message_count: u32,
    pub max_messages: u32,
}

// Constants for layout
const HEADER_SIZE: usize = 8;  // 4 bytes each for message_count and max_messages
const MESSAGE_SIZE: usize = 8 + 64 + 64; // timestamp + name + message = 136 bytes
const MAX_WALL_SIZE: usize = 9_000_000;  // ~9MB

impl From<GraffitiError> for ProgramError {
    fn from(e: GraffitiError) -> Self {
        match e {
            GraffitiError::WallFull => ProgramError::Custom(1),
            GraffitiError::AccountTooSmall => ProgramError::Custom(2),
        }
    }
}

impl GraffitiError {
    fn message(&self) -> &str {
        match self {
            GraffitiError::WallFull => "The graffiti wall is full",
            GraffitiError::AccountTooSmall => "Account is too small to store message",
        }
    }
}

impl GraffitiWallHeader {
    fn get_message_offset(index: usize) -> usize {
        HEADER_SIZE + (index * MESSAGE_SIZE)
    }
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> Result<(), ProgramError> {
    msg!("Graffiti Wall: Processing instruction");
    
    let account_iter = &mut accounts.iter();
    let signer_account = next_account_info(account_iter)?;
    let wall_account = next_account_info(account_iter)?;

    if !signer_account.is_signer {
        msg!("Error: Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }
    if !wall_account.is_writable {
        msg!("Error: Account not writable");
        return Err(ProgramError::InvalidAccountData);
    }

    let params = GraffitiWallParams::try_from_slice(instruction_data).map_err(|e| {
        msg!("Error: Failed to deserialize instruction data: {}", e);
        ProgramError::InvalidInstructionData
    })?;

    let mut data = wall_account.try_borrow_mut_data()?;
    
    // Read or create header
    let mut header = if data.len() > 0 {
        GraffitiWallHeader::try_from_slice(&data[..HEADER_SIZE]).map_err(|e| {
            msg!("Error: Failed to deserialize header: {}", e);
            ProgramError::InvalidAccountData
        })?
    } else {
        GraffitiWallHeader {
            message_count: 0,
            max_messages: ((MAX_WALL_SIZE - HEADER_SIZE) / MESSAGE_SIZE) as u32,
        }
    };

    // Check if wall is full
    if header.message_count >= header.max_messages {
        msg!("Error: {}", GraffitiError::WallFull.message());
        return Err(GraffitiError::WallFull.into());
    }

    // Calculate new message position
    let message_offset = GraffitiWallHeader::get_message_offset(header.message_count as usize);
    let required_size = message_offset + MESSAGE_SIZE;

    // Reallocate if needed
    if required_size > data.len() {
        drop(data);
        wall_account.realloc(required_size, false)?;
        data = wall_account.try_borrow_mut_data()?;
    }

    // Create and serialize new message directly to the correct position
    let new_message = GraffitiMessage {
        timestamp: get_clock().unix_timestamp,
        name: params.name,
        message: params.message,
    };
    
    new_message.serialize(&mut &mut data[message_offset..message_offset + MESSAGE_SIZE])
        .map_err(|_| ProgramError::AccountDataTooSmall)?;

    // Update and save header
    header.message_count += 1;
    header.serialize(&mut &mut data[..HEADER_SIZE])
        .map_err(|_| ProgramError::AccountDataTooSmall)?;

    msg!("Graffiti Wall: Message added successfully at position {}", header.message_count - 1);
    Ok(())
}

// Add helper functions for clients to read messages
pub fn get_message_at_index(data: &[u8], index: usize) -> Result<GraffitiMessage, ProgramError> {
    let header = GraffitiWallHeader::try_from_slice(&data[..HEADER_SIZE])
        .map_err(|_| ProgramError::InvalidAccountData)?;
    
    if index >= header.message_count as usize {
        return Err(ProgramError::InvalidArgument);
    }

    let offset = GraffitiWallHeader::get_message_offset(index);
    GraffitiMessage::try_from_slice(&data[offset..offset + MESSAGE_SIZE])
        .map_err(|_| ProgramError::InvalidAccountData)
}
