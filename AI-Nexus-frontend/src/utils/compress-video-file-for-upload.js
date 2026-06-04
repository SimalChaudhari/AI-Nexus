import {
  formatMaxUploadLabel,
  getCeoVideoMaxBytes,
  getProxySafeMaxBytes,
  getSectionVideoMaxBytes,
} from './upload-proxy-limits';

function fitDimensions(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function getPreferredVideoMimeType() {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function pickInitialBitrate(fileSize, maxBytes) {
  const ratio = Math.min(1, maxBytes / Math.max(fileSize, 1));
  if (ratio < 0.15) return 400_000;
  if (ratio < 0.35) return 800_000;
  return 1_500_000;
}

function blobToFile(blob, originalName, mimeType) {
  const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
  const baseName = String(originalName || 'video').replace(/\.[^.]+$/, '') || 'video';
  return new File([blob], `${baseName}${ext}`, { type: mimeType, lastModified: Date.now() });
}

function buildTooLargeError(maxBytes) {
  return new Error(
    `This video is too large. Maximum upload size is ${formatMaxUploadLabel(maxBytes)}. Try a shorter or lower-resolution file.`
  );
}

function transcodeVideoToBlob(file, { maxWidth, maxHeight, mimeType, bitrate }) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video for compression'));
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        cleanup();
        reject(new Error('Could not read video duration'));
        return;
      }

      const { width, height } = fitDimensions(video.videoWidth, video.videoHeight, maxWidth, maxHeight);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Video compression is not supported in this browser'));
        return;
      }

      const fps = 24;
      const stream = canvas.captureStream(fps);
      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      } catch {
        cleanup();
        reject(new Error('Video compression is not supported in this browser'));
        return;
      }

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        cleanup();
        reject(new Error('Video compression failed'));
      };
      recorder.onstop = () => {
        cleanup();
        resolve(new Blob(chunks, { type: mimeType }));
      };

      let stopped = false;
      const stopRecording = () => {
        if (stopped) return;
        stopped = true;
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {
          reject(new Error('Video compression failed'));
        }
        stream.getTracks().forEach((track) => track.stop());
        video.pause();
      };

      recorder.start(250);
      video.currentTime = 0;

      video
        .play()
        .then(() => {
          const drawFrame = () => {
            if (stopped) return;
            if (video.ended || video.currentTime >= duration) {
              stopRecording();
              return;
            }
            try {
              ctx.drawImage(video, 0, 0, width, height);
            } catch {
              stopRecording();
              return;
            }
            requestAnimationFrame(drawFrame);
          };
          video.onended = stopRecording;
          drawFrame();
          window.setTimeout(stopRecording, Math.ceil(duration * 1000) + 3000);
        })
        .catch(() => {
          cleanup();
          reject(new Error('Could not play video for compression'));
        });
    };

    video.src = objectUrl;
  });
}

/**
 * Shrink/re-encode video before upload (same idea as compressImageFileForUpload for proxy limits).
 */
export async function compressVideoFileForUpload(
  file,
  { maxBytes = getProxySafeMaxBytes(), maxWidth = 1280, maxHeight = 720 } = {}
) {
  if (!file || typeof File === 'undefined') return file;
  const type = String(file.type || '').toLowerCase();
  if (!type.startsWith('video/')) return file;
  if (file.size <= maxBytes) return file;

  const mimeType = getPreferredVideoMimeType();
  if (!mimeType) throw buildTooLargeError(maxBytes);

  const bitrate = pickInitialBitrate(file.size, maxBytes);
  const attempts = [
    { maxWidth, maxHeight, bitrate },
    { maxWidth: 960, maxHeight: 540, bitrate: Math.min(bitrate, 750_000) },
    { maxWidth: 640, maxHeight: 360, bitrate: Math.min(bitrate, 420_000) },
  ];

  for (const attempt of attempts) {
    try {
      const blob = await transcodeVideoToBlob(file, { ...attempt, mimeType });
      if (blob?.size && blob.size <= maxBytes) {
        return blobToFile(blob, file.name, mimeType);
      }
    } catch {
      // try next profile
    }
  }

  throw buildTooLargeError(maxBytes);
}

export async function compressCeoLaunchVideoForUpload(file) {
  return compressVideoFileForUpload(file, { maxBytes: getCeoVideoMaxBytes() });
}

export async function compressSectionVideoForUpload(file) {
  return compressVideoFileForUpload(file, { maxBytes: getSectionVideoMaxBytes() });
}
