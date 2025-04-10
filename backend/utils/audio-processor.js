/**
 * Audio Processor Utility for Aikira Terminal
 * Handles audio processing and optimization for Whisper and Eleven Labs
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Max size allowed by Whisper API (25MB)
const MAX_WHISPER_SIZE = 25 * 1024 * 1024;

/**
 * Processes an audio file for optimal Whisper API transcription
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} Path to processed file
 */
async function processForWhisper(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // Check if file is already optimized (under 25MB and in supported format)
    if (stats.size < MAX_WHISPER_SIZE && ['.mp3', '.mp4', '.mpeg', '.m4a', '.wav', '.webm'].includes(fileExtension)) {
      console.log('File already optimized for Whisper API');
      return filePath;
    }
    
    // Create a new filename for the processed file
    const outputDir = path.dirname(filePath);
    const outputFileName = `whisper_${path.basename(filePath, fileExtension)}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('ffmpeg not found, skipping audio optimization');
      return filePath;
    }
    
    // Process the audio file with ffmpeg
    // - Convert to mp3 format
    // - Set bitrate to 64k for smaller file size
    // - Set sample rate to 16kHz for better Whisper performance
    // - Set audio to mono channel
    const ffmpegCommand = `ffmpeg -i "${filePath}" -ar 16000 -ac 1 -c:a libmp3lame -b:a 64k "${outputPath}"`;
    
    await execAsync(ffmpegCommand);
    
    // Verify the new file size
    const newStats = fs.statSync(outputPath);
    
    if (newStats.size > MAX_WHISPER_SIZE) {
      console.warn('Processed file still exceeds Whisper API size limit');
      // Try more aggressive compression
      const emergencyOutputPath = path.join(outputDir, `emergency_${outputFileName}`);
      const emergencyCommand = `ffmpeg -i "${outputPath}" -ar 16000 -ac 1 -c:a libmp3lame -b:a 32k "${emergencyOutputPath}"`;
      
      await execAsync(emergencyCommand);
      
      // Remove the first processed file
      fs.unlinkSync(outputPath);
      
      return emergencyOutputPath;
    }
    
    return outputPath;
  } catch (error) {
    console.error('Audio processing error:', error);
    // Return original file path if processing fails
    return filePath;
  }
}

/**
 * Splits a long audio file into segments for API processing
 * @param {string} filePath - Path to the audio file
 * @param {number} maxDurationSeconds - Maximum duration in seconds for each segment
 * @returns {Promise<Array<string>>} Array of file paths for the segments
 */
async function splitAudioFile(filePath, maxDurationSeconds = 60) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('ffmpeg not found, skipping audio splitting');
      return [filePath];
    }
    
    // Get audio duration
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
    const duration = parseFloat(stdout.trim());
    
    // If file is shorter than maximum duration, return original file
    if (duration <= maxDurationSeconds) {
      return [filePath];
    }
    
    // Calculate number of segments
    const segmentCount = Math.ceil(duration / maxDurationSeconds);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(path.dirname(filePath), 'segments');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create base output path
    const fileExtension = path.extname(filePath);
    const fileBaseName = path.basename(filePath, fileExtension);
    
    // Create segments
    const segmentPaths = [];
    
    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * maxDurationSeconds;
      const outputPath = path.join(outputDir, `${fileBaseName}_segment${i + 1}${fileExtension}`);
      
      // Use ffmpeg to extract segment
      const ffmpegCommand = `ffmpeg -i "${filePath}" -ss ${startTime} -t ${maxDurationSeconds} -c copy "${outputPath}"`;
      
      await execAsync(ffmpegCommand);
      
      segmentPaths.push(outputPath);
    }
    
    return segmentPaths;
  } catch (error) {
    console.error('Audio splitting error:', error);
    // Return original file path if splitting fails
    return [filePath];
  }
}

/**
 * Analyzes audio properties
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<Object>} Audio properties
 */
async function analyzeAudio(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if ffprobe is available
    try {
      await execAsync('ffprobe -version');
    } catch (error) {
      console.warn('ffprobe not found, skipping audio analysis');
      return {
        format: path.extname(filePath).substring(1),
        size: fs.statSync(filePath).size,
        error: 'ffprobe not available for detailed analysis'
      };
    }
    
    // Run ffprobe to get audio information
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration,bit_rate:stream=codec_name,sample_rate,channels -of json "${filePath}"`);
    
    // Parse ffprobe output
    const probeData = JSON.parse(stdout);
    
    // Extract relevant information
    const info = {
      format: probeData.format?.format_name || path.extname(filePath).substring(1),
      duration: probeData.format?.duration ? parseFloat(probeData.format.duration) : null,
      bitrate: probeData.format?.bit_rate ? parseInt(probeData.format.bit_rate, 10) : null,
      codec: probeData.streams?.[0]?.codec_name || null,
      sampleRate: probeData.streams?.[0]?.sample_rate ? parseInt(probeData.streams[0].sample_rate, 10) : null,
      channels: probeData.streams?.[0]?.channels || null,
      size: fs.statSync(filePath).size
    };
    
    return info;
  } catch (error) {
    console.error('Audio analysis error:', error);
    // Return basic info if analysis fails
    return {
      format: path.extname(filePath).substring(1),
      size: fs.statSync(filePath).size,
      error: error.message
    };
  }
}

/**
 * Normalizes audio volume levels
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} Path to normalized file
 */
async function normalizeAudio(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('ffmpeg not found, skipping audio normalization');
      return filePath;
    }
    
    // Create a new filename for the normalized file
    const fileExtension = path.extname(filePath);
    const outputPath = filePath.replace(fileExtension, `_normalized${fileExtension}`);
    
    // Normalize audio using ffmpeg
    const ffmpegCommand = `ffmpeg -i "${filePath}" -filter:a loudnorm=I=-16:TP=-1.5:LRA=11 "${outputPath}"`;
    
    await execAsync(ffmpegCommand);
    
    return outputPath;
  } catch (error) {
    console.error('Audio normalization error:', error);
    // Return original file path if normalization fails
    return filePath;
  }
}

/**
 * Removes background noise from audio
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} Path to noise-reduced file
 */
async function removeNoise(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('ffmpeg not found, skipping noise removal');
      return filePath;
    }
    
    // Create a new filename for the processed file
    const fileExtension = path.extname(filePath);
    const outputPath = filePath.replace(fileExtension, `_noisereduced${fileExtension}`);
    
    // Apply noise reduction using ffmpeg
    const ffmpegCommand = `ffmpeg -i "${filePath}" -af "highpass=f=200,lowpass=f=3000,afftdn=nf=-25" "${outputPath}"`;
    
    await execAsync(ffmpegCommand);
    
    return outputPath;
  } catch (error) {
    console.error('Noise removal error:', error);
    // Return original file path if noise removal fails
    return filePath;
  }
}

/**
 * Concatenates multiple audio files into one
 * @param {Array<string>} filePaths - Array of file paths to concatenate
 * @param {string} outputPath - Path for the output file
 * @returns {Promise<string>} Path to concatenated file
 */
async function concatenateAudio(filePaths, outputPath) {
  try {
    // Check if files exist
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
    }
    
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('ffmpeg not found, skipping audio concatenation');
      return filePaths[0];
    }
    
    // Create a temporary file list
    const tempListPath = path.join(path.dirname(outputPath), 'temp_file_list.txt');
    const fileList = filePaths.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
    
    fs.writeFileSync(tempListPath, fileList);
    
    // Concatenate files using ffmpeg
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${tempListPath}" -c copy "${outputPath}"`;
    
    await execAsync(ffmpegCommand);
    
    // Remove temporary file list
    fs.unlinkSync(tempListPath);
    
    return outputPath;
  } catch (error) {
    console.error('Audio concatenation error:', error);
    // Return first file path if concatenation fails
    return filePaths[0];
  }
}

// Export functions
module.exports = {
  processForWhisper,
  splitAudioFile,
  analyzeAudio,
  normalizeAudio,
  removeNoise,
  concatenateAudio
};