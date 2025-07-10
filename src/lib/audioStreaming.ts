// 音訊流式播放實現
export class StreamingAudioPlayer {
  private audio: HTMLAudioElement | null = null
  private mediaSource: MediaSource | null = null
  private sourceBuffer: SourceBuffer | null = null
  private chunks: Uint8Array[] = []
  private isStreamingComplete = false
  
  constructor() {
    // 檢查瀏覽器支援度
    if (!('MediaSource' in window)) {
      console.warn('MediaSource API not supported, falling back to blob playback')
    }
  }

  // 檢查是否支援流式播放
  static isStreamingSupported(): boolean {
    return 'MediaSource' in window && MediaSource.isTypeSupported('audio/mpeg')
  }

  // 流式播放音訊
  async playStreamingAudio(audioUrl: string, onProgress?: (loaded: number, total: number) => void): Promise<HTMLAudioElement> {
    // 如果不支援流式播放，回退到傳統方式
    if (!StreamingAudioPlayer.isStreamingSupported()) {
      return this.playTraditionalAudio(audioUrl)
    }

    try {
      return await this.initializeStreaming(audioUrl, onProgress)
    } catch (error) {
      console.warn('Streaming failed, falling back to traditional playback:', error)
      return this.playTraditionalAudio(audioUrl)
    }
  }

  // 初始化流式播放
  private async initializeStreaming(audioUrl: string, onProgress?: (loaded: number, total: number) => void): Promise<HTMLAudioElement> {
    // 清理之前的資源
    this.cleanup()

    // 創建 MediaSource
    this.mediaSource = new MediaSource()
    this.audio = new Audio()
    this.audio.src = URL.createObjectURL(this.mediaSource)

    return new Promise<HTMLAudioElement>((resolve, reject) => {
      if (!this.mediaSource) {
        reject(new Error('MediaSource not initialized'))
        return
      }

      this.mediaSource.addEventListener('sourceopen', async () => {
        try {
          if (!this.mediaSource) throw new Error('MediaSource lost')
          
          // 創建 SourceBuffer
          this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg')
          
          // 開始下載和播放
          await this.streamAudioData(audioUrl, onProgress)
          
          if (this.audio) {
            resolve(this.audio)
          } else {
            reject(new Error('Audio element lost'))
          }
        } catch (error) {
          reject(error)
        }
      })

      this.mediaSource.addEventListener('error', () => {
        reject(new Error('MediaSource error'))
      })
    })
  }

  // 流式下載和播放音訊數據
  private async streamAudioData(audioUrl: string, onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const response = await fetch(audioUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('ReadableStream not supported')
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0')
    let receivedLength = 0

    const processChunk = async (): Promise<void> => {
      try {
        const { done, value } = await reader.read()
        
        if (done) {
          this.isStreamingComplete = true
          if (this.mediaSource && this.mediaSource.readyState === 'open') {
            this.mediaSource.endOfStream()
          }
          return
        }

        if (value) {
          receivedLength += value.length
          this.chunks.push(value)
          
          // 報告下載進度
          if (onProgress && contentLength > 0) {
            onProgress(receivedLength, contentLength)
          }

          // 將數據添加到 SourceBuffer
          if (this.sourceBuffer && !this.sourceBuffer.updating) {
            this.sourceBuffer.appendBuffer(value.buffer as ArrayBuffer)
          } else {
            // 如果 SourceBuffer 正在更新，等待
            await this.waitForSourceBufferUpdate()
            if (this.sourceBuffer) {
              this.sourceBuffer.appendBuffer(value.buffer as ArrayBuffer)
            }
          }

          // 開始播放（如果尚未開始）
          if (this.audio && this.audio.paused && receivedLength > 8192) { // 8KB 緩衝
            try {
              await this.audio.play()
            } catch (playError) {
              console.warn('Play failed:', playError)
            }
          }
        }

        // 遞歸處理下一個chunk
        if (this.sourceBuffer) {
          this.sourceBuffer.addEventListener('updateend', processChunk, { once: true })
        }
      } catch (error) {
        console.error('Chunk processing failed:', error)
        throw error
      }
    }

    // 開始處理第一個chunk
    await processChunk()
  }

  // 等待 SourceBuffer 更新完成
  private waitForSourceBufferUpdate(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.sourceBuffer || !this.sourceBuffer.updating) {
        resolve()
        return
      }
      
      this.sourceBuffer.addEventListener('updateend', () => resolve(), { once: true })
    })
  }

  // 傳統音訊播放（回退方案）
  private async playTraditionalAudio(audioUrl: string): Promise<HTMLAudioElement> {
    this.cleanup()
    
    this.audio = new Audio()
    this.audio.preload = 'auto'
    this.audio.src = audioUrl
    
    return new Promise<HTMLAudioElement>((resolve, reject) => {
      if (!this.audio) {
        reject(new Error('Audio element not created'))
        return
      }

      this.audio.addEventListener('canplaythrough', () => {
        if (this.audio) {
          this.audio.play()
            .then(() => resolve(this.audio!))
            .catch(reject)
        }
      }, { once: true })

      this.audio.addEventListener('error', () => {
        reject(new Error('Audio load failed'))
      })
    })
  }

  // 停止播放
  stop(): void {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
    this.cleanup()
  }

  // 清理資源
  cleanup(): void {
    if (this.audio) {
      this.audio.pause()
      if (this.audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.audio.src)
      }
      this.audio = null
    }

    if (this.mediaSource) {
      if (this.mediaSource.readyState === 'open') {
        try {
          this.mediaSource.endOfStream()
        } catch (error) {
          console.warn('MediaSource endOfStream failed:', error)
        }
      }
      this.mediaSource = null
    }

    this.sourceBuffer = null
    this.chunks = []
    this.isStreamingComplete = false
  }

  // 獲取播放狀態
  getPlaybackInfo(): {
    isPlaying: boolean
    currentTime: number
    duration: number
    buffered: number
    isStreamingComplete: boolean
  } {
    const audio = this.audio
    const buffered = audio?.buffered.length ? audio.buffered.end(audio.buffered.length - 1) : 0

    return {
      isPlaying: audio ? !audio.paused : false,
      currentTime: audio?.currentTime || 0,
      duration: audio?.duration || 0,
      buffered,
      isStreamingComplete: this.isStreamingComplete
    }
  }
}

// 工廠函數：創建適當的播放器
export function createAudioPlayer(): StreamingAudioPlayer {
  return new StreamingAudioPlayer()
}

// 簡化的流式播放函數
export async function playStreamingAudio(
  audioUrl: string, 
  onProgress?: (loaded: number, total: number) => void,
  onEnded?: () => void
): Promise<HTMLAudioElement> {
  const player = createAudioPlayer()
  
  try {
    const audio = await player.playStreamingAudio(audioUrl, onProgress)
    
    if (onEnded) {
      audio.addEventListener('ended', () => {
        onEnded()
        player.cleanup()
      }, { once: true })
    }
    
    return audio
  } catch (error) {
    player.cleanup()
    throw error
  }
}