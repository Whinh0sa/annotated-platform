import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

export const compressVideoBlob = async (videoBlob: Blob): Promise<Uint8Array | null> => {
  try {
    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    const inputName = 'input.webm';
    const outputName = 'output.mp4';

    // 1. Write the raw blob into WASM's virtual file system
    ffmpeg.writeFile(inputName, await fetchFile(videoBlob));

    // 2. Execute FFmpeg Command
    // -vf scale=-2:240 (Proportional scale to 240p height)
    // -t 90 (Hard cap at 90 seconds)
    // -preset veryfast (Optimize for client-side CPU constraints)
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', 'scale=-2:240',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-t', '90',
      outputName
    ]);

    // 3. Extract the compressed file
    const compressedData = await ffmpeg.readFile(outputName);

    // Actionable Takeaway: Explicit Memory Deallocation 
    // This prevents the OOM crash and keeps the extension lightweight
    ffmpeg.deleteFile(inputName);
    ffmpeg.deleteFile(outputName);

    return compressedData as Uint8Array;

  } catch (error) {
    console.error("WASM Compression Pipeline Failed:", error);
    return null;
  }
}
