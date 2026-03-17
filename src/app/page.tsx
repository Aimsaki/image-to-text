/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Sparkles, Copy, Instagram, ShoppingBag, Globe, Video, Mic2, RefreshCw, Settings } from 'lucide-react'

interface UploadedImage {
  id: string
  preview: string
  base64: string
  file: File
}

interface PlatformConfig {
  id: string
  name: string
  icon: any
  color: string
  bg: string
  border: string
  activeRing: string
}

const DEFAULT_PROMPTS: Record<string, string> = {
  rednote: `你是一位拥有百万粉丝的**资深小红书内容运营**。
【能力】：擅长挖掘痛点，通过"情绪价值"和"真实体验"打造高赞笔记。

【爆款公式】：
1. **标题 (Hook)**：极具吸引力！拒绝平铺直叙。
   - 悬念式/反差式/痛点式，必须带Emoji。
2. **正文 (Content)**：
   - **语气**：真诚KOC视角，像闺蜜安利，拒绝AI味。
   - **排版**：善用Emoji (✨🌱💡)，段落短促，阅读轻松。
3. **标签**：文末5个精准流量标签。`,

  taobao: `你是一位天猫/淘宝金牌运营，一切为了转化。
【任务】：详情页首屏营销短文案。
【要求】：
1. **简单粗暴**：直接讲好处，要功利。
2. **标题**：30字内营销短标题。
3. **卖点**：3个核心优势（顺丰包邮/终身质保）。
4. **紧迫感**：限时/库存告急。`,

  amazon: `You are an Amazon product listing expert. Based on the image, create a compelling product description.
Requirements:
1. Highlight key features and benefits
2. Use bullet points for easy reading
3. Include relevant keywords for SEO
4. Professional tone
Please output content directly without any titles or formatting markers.`,

  tiktok: `You are a viral TikTok script writer. Based on the image, create a short, engaging video script.
Requirements:
1. **Hook (0-3s)**: Stop scrolling immediately.
2. **Problem**: Show the struggle.
3. **Solution**: Reveal product as hero.
4. **CTA**: Link in bio.
Please output content directly without any titles or formatting markers.`,
}

export default function HomePage() {
  const [platform, setPlatform] = useState('rednote')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [isProAudio, setIsProAudio] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('customPrompts')
    return saved ? JSON.parse(saved) : {}
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError('')
    Promise.all(
      acceptedFiles.map(async (f, i) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(f)
        })
        return {
          id: `${Date.now()}-${i}`,
          preview: URL.createObjectURL(f),
          base64: base64.split(',')[1],
          file: f,
        }
      })
    ).then((imgs) => setUploadedImages((prev) => [...prev, ...imgs]))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
  })

  const handleGenerate = async (isRetry = false) => {
    if (uploadedImages.length === 0) {
      setError('请上传图片')
      return
    }
    
    setIsGenerating(true)
    if (!isRetry) {
      setGeneratedContent('')
      setRetryCount(0)
    }
    setError('')
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          tone: 'passion',
          isProAudio,
          images: uploadedImages.map((i) => i.base64),
          additionalInfo,
          customPrompt: customPrompts[platform] || '',
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `服务器错误 (${res.status})`
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
            errorMessage = '服务暂时不可用，请稍后重试'
          }
        }
        throw new Error(errorMessage)
      }
      
      const data = await res.json()
      
      if (data.content) {
        setGeneratedContent(data.content)
        setRetryCount(0)
      } else {
        throw new Error('未获取到生成内容')
      }
    } catch (e: any) {
      console.error('生成错误:', e)
      let errorMessage = '生成失败，请重试'
      
      if (e.name === 'AbortError') {
        errorMessage = '请求超时，请点击重试'
      } else if (e.message?.includes('fetch failed') || e.message?.includes('Failed to fetch')) {
        errorMessage = '网络连接失败，请检查网络后重试'
      } else if (e.message?.includes('NetworkError')) {
        errorMessage = '网络错误，请检查网络连接'
      } else if (e.message) {
        errorMessage = e.message
      }
      
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    handleGenerate(true)
  }

  const handleSaveCustomPrompt = () => {
    localStorage.setItem('customPrompts', JSON.stringify(customPrompts))
    setShowSettings(false)
    alert('提示词已保存')
  }

  const handleResetPrompt = (platformId: string) => {
    setCustomPrompts(prev => ({
      ...prev,
      [platformId]: DEFAULT_PROMPTS[platformId] || '',
    }))
  }

  const platforms: PlatformConfig[] = [
    { id: 'rednote', name: '小红书', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200', activeRing: 'ring-pink-500' },
    { id: 'taobao', name: '淘宝/天猫', icon: ShoppingBag, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', activeRing: 'ring-orange-500' },
    { id: 'amazon', name: '亚马逊', icon: Globe, color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300', activeRing: 'ring-slate-800' },
    { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', activeRing: 'ring-cyan-500' },
  ]

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 min-h-screen bg-slate-50">
      <div className="w-full lg:col-span-4 bg-white border-b lg:border-r border-slate-200 p-4 sm:p-6 overflow-y-auto shrink-0">
        <h2 className="font-bold text-lg sm:text-xl mb-4 sm:mb-6 flex items-center gap-2 text-slate-800">
          <Sparkles className="text-indigo-600 w-5 h-5" /> AI 爆款文案
        </h2>

        <div className="space-y-6 sm:space-y-8">
          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">目标平台</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setError('') }}
                  className={`cursor-pointer border rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 transition-all duration-200 relative overflow-hidden ${
                    platform === p.id ? `${p.bg} ${p.border} ring-2 ${p.activeRing} ring-offset-1` : 'border-slate-100 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white shadow-sm ${p.color}`}>
                    <p.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${platform === p.id ? 'text-slate-900' : 'text-slate-600'}`}>{p.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSettings(true) }}
                    className="absolute top-1 right-1 w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
                    title="自定义提示词"
                  >
                    <Settings className="w-3 h-3 text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            onClick={() => { setIsProAudio(!isProAudio); setError('') }}
            className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border cursor-pointer transition-all select-none ${
              isProAudio ? 'bg-indigo-600 border-indigo-600 shadow-md transform scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-full transition-colors ${isProAudio ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-xs sm:text-sm ${isProAudio ? 'text-white' : 'text-slate-800'}`}>演艺/音响专业模式</span>
                <span className={`text-[10px] sm:text-xs ${isProAudio ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {isProAudio ? '已启用：输出工程级参数文案' : '点击开启专业术语增强'}
                </span>
              </div>
            </div>
            <div className={`w-9 h-5 sm:w-10 sm:h-6 rounded-full relative transition-colors ${isProAudio ? 'bg-white' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 sm:top-1 w-4 h-4 rounded-full transition-all ${isProAudio ? 'left-4 sm:left-5 bg-indigo-600' : 'left-0.5 sm:left-1 bg-white shadow-sm'}`}></div>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-slate-700">产品素材</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}>
              <input {...getInputProps()} />
              <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-slate-500">点击或拖拽上传图片</p>
            </div>
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.preview} alt="preview" className="w-full h-14 sm:h-16 object-cover rounded-lg border border-slate-100 shadow-sm" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadedImages((prev) => prev.filter((i) => i.id !== img.id)); setError('') }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">补充卖点 (可选)</label>
            <textarea
              value={additionalInfo}
              onChange={(e) => { setAdditionalInfo(e.target.value); setError('') }}
              placeholder="例如：德国进口单元，适用于千人场，D类功放..."
              className="w-full h-16 sm:h-20 px-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-sm flex-1">⚠️ {error}</span>
                <button
                  onClick={handleRetry}
                  disabled={isGenerating}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  重试
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="w-full h-11 sm:h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base sm:text-lg font-medium rounded-lg shadow-lg shadow-indigo-200/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'AI 正在创作...' : '一键生成文案'}
          </button>
        </div>
      </div>

      <div className="w-full lg:col-span-8 p-4 sm:p-6 lg:p-8 bg-slate-100/50 overflow-y-auto min-h-[400px] lg:min-h-0">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 p-4 sm:p-8 lg:p-12 relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 backdrop-blur-sm rounded-2xl">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">
                  {isProAudio ? '正在查阅声学参数...' : 'AI 正在疯狂码字...'}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm">
                  正在匹配{isProAudio ? '专业演艺设备' : platforms.find((p) => p.id === platform)?.name}风格
                </p>
                <p className="text-slate-400 text-xs mt-2">预计需要 10-30 秒</p>
              </div>
            )}

            {!isGenerating && generatedContent ? (
              <>
                <div className="prose prose-sm sm:prose-lg max-w-none whitespace-pre-wrap text-slate-700 font-medium leading-relaxed">
                  {generatedContent}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(generatedContent); alert('已复制') }}
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 复制
                </button>
              </>
            ) : (
              !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                  <Sparkles className="w-16 h-16 sm:w-24 sm:h-24 mb-4 sm:mb-6 opacity-10" />
                  <p className="text-base sm:text-xl font-medium text-slate-400">准备好了吗？</p>
                  <p className="text-xs sm:text-sm mt-2">选择平台 → 开启{isProAudio ? '专业模式' : '模式'} → 上传图片</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">自定义提示词</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {platforms.map((p) => (
                <div key={p.id} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.bg}`}>
                      <p.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-700">{p.name}</span>
                  </div>
                  <textarea
                    value={customPrompts[p.id] || ''}
                    onChange={(e) => setCustomPrompts(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="输入自定义提示词（留空使用系统默认）"
                    className="w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleResetPrompt(p.id)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    恢复默认
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveCustomPrompt}
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 h-11 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
