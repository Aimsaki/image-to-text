import { NextResponse } from 'next/server'

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY

async function analyzeImages(images: string[], prompt: string, retryCount = 0): Promise<string> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY 未配置')
  }

  const formattedImages = images.map((img) => {
    if (img.startsWith('data:image')) return img
    return `data:image/jpeg;base64,${img}`
  })

  const contentParts = [
    ...formattedImages.map((img) => ({
      type: 'image_url',
      image_url: { url: img },
    })),
    { type: 'text', text: prompt },
  ]

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-vl-max',
        messages: [{ role: 'user', content: contentParts }],
        max_tokens: 2000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = 'API调用失败'
      try {
        const error = await response.json()
        errorMessage = error.message || error.error?.message || errorMessage
      } catch {
        errorMessage = `API错误 (${response.status})`
      }
      
      if (response.status === 429) {
        errorMessage = '请求过于频繁，请稍后重试'
      } else if (response.status === 503 || response.status === 502) {
        errorMessage = '服务暂时不可用，请稍后重试'
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('API请求超时，请重试')
    }
    
    if (retryCount < 1 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
      console.log('API请求失败，自动重试...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      return analyzeImages(images, prompt, retryCount + 1)
    }
    
    throw error
  }
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  es: 'Español',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { platform, tone, images, additionalInfo, isProAudio, customPrompt, language } = body

    if (!images || images.length === 0) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 })
    }

    let finalPrompt = customPrompt
    const targetLanguage = language || 'en'
    const languageName = LANGUAGE_MAP[targetLanguage] || 'English'

    if (!finalPrompt) {
      const proInstruction = isProAudio
        ? `\n【⚠️专业音响模式开启】：
       - 角色切换为：资深声学工程师/演艺现场专家。
       - 关键词必须硬核：使用SPL、频响曲线、D类功放、Dante协议、心型指向等术语。
       - 拒绝肤浅的形容词，用数据和工程参数说话。`
        : ''

      let platformStyle = ''

      switch (platform) {
        case 'rednote':
          platformStyle = `
        【角色】：你是一位拥有百万粉丝的**资深小红书内容运营**。
        【能力】：擅长挖掘痛点，通过"情绪价值"和"真实体验"打造高赞笔记。
        
        【爆款公式】：
        1. **标题 (Hook)**：极具吸引力！拒绝平铺直叙。
           - 悬念式/反差式/痛点式，必须带Emoji。
        2. **正文 (Content)**：
           - **语气**：真诚KOC视角，像闺蜜安利，拒绝AI味。
           - **排版**：善用Emoji (✨🌱💡)，段落短促，阅读轻松。
        3. **标签**：文末5个精准流量标签。
      `
          break

        case 'amazon':
          platformStyle = `
        【Role】: Top-Tier Amazon SEO Copywriter.
        
        【Format】:
        1. **Title**: [Brand] + [Keywords] + [Features] + [Model] (Max 200 chars).
        2. **5 Bullet Points**: [CAPS HEADER] - Benefit. Focus on pain points & specs.
        3. **Description**: 150 words usage scenario.
        【Tone】: Professional, Trustworthy.
      `
          break

        case 'taobao':
          platformStyle = `
        【角色】：天猫/淘宝金牌运营，一切为了转化。
        【任务】：详情页首屏营销短文案。
        【要求】：
        1. **简单粗暴**：直接讲好处，要功利。
        2. **标题**：30字内营销短标题。
        3. **卖点**：3个核心优势（顺丰包邮/终身质保）。
        4. **紧迫感**：限时/库存告急。
      `
          break

        case 'tiktok':
          platformStyle = `
        【Role】: Viral TikTok Script Writer.
        
        【Structure】:
        1. **Hook (0-3s)**: Stop scrolling immediately.
        2. **Problem**: Show that struggle.
        3. **Solution**: Reveal product as hero.
        4. **CTA**: Link in bio.
      `
          break

        default:
          platformStyle = `你是一位金牌文案。请基于图片生成适合 ${platform} 平台的推广内容。`
      }

      finalPrompt = `
        ${platformStyle}
        ${proInstruction}
        【注意】：忽略背景杂物，只关注核心产品。
      `
    }

    if (additionalInfo) {
      finalPrompt += `\n\n【用户补充信息】\n${additionalInfo}`
    }

    finalPrompt += `\n\n【重要语言要求】：请务必使用${languageName}输出全部文案内容。不要使用其他语言。`

    finalPrompt += '\n\n请直接输出最终文案，不要输出思考过程。'

    console.log(`📝 Generating [${platform}] Language: ${languageName} ProMode: ${isProAudio ? 'ON' : 'OFF'} CustomPrompt: ${customPrompt ? 'YES' : 'NO'} Images: ${images.length}...`)

    const result = await analyzeImages(images, finalPrompt)

    if (!result || result.trim() === '') {
      throw new Error('AI返回内容为空，请重试')
    }

    console.log(`✅ Generated successfully, length: ${result.length}`)
    return NextResponse.json({ content: result })
  } catch (error: any) {
    console.error('Copywriter error:', error)
    
    let errorMessage = error.message || '生成失败'
    
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
      errorMessage = '数据解析错误，请重试'
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      errorMessage = '请求超时，请检查网络后重试'
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorMessage = '网络连接失败，请检查网络'
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
