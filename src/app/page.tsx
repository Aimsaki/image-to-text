/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Sparkles, Copy, Instagram, ShoppingBag, Globe, Video, Mic2 } from 'lucide-react'

interface UploadedImage {
  id: string
  preview: string
  base64: string
  file: File
}

export default function HomePage() {
  const [platform, setPlatform] = useState('rednote')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [isProAudio, setIsProAudio] = useState(false)
  const [error, setError] = useState('')

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

  const handleGenerate = async () => {
    if (uploadedImages.length === 0) {
      setError('请上传图片')
      return
    }
    
    setIsGenerating(true)
    setGeneratedContent('')
    setError('')
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          tone: 'passion',
          isProAudio,
          images: uploadedImages.map((i) => i.base64),
          additionalInfo,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || `服务器错误 (${res.status})`)
      }
      
      if (data.content) {
        setGeneratedContent(data.content)
      } else {
        throw new Error('未获取到生成内容')
      }
    } catch (e: any) {
      console.error('生成错误:', e)
      if (e.name === 'AbortError') {
        setError('请求超时，请重试')
      } else if (e.message) {
        setError(e.message)
      } else {
        setError('生成失败，请检查网络连接')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const platforms = [
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
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
    </div>
  )
}
