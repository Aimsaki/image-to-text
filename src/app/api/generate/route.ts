import { NextRequest, NextResponse } from 'next/server'

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY

const PLATFORM_PROMPTS: Record<string, string> = {
  rednote: `你是一位小红书爆款文案专家。请根据图片内容，生成一篇吸引人的种草文案。
要求：
1. 标题要吸引眼球，可用emoji
2. 正文要有"姐妹们"等亲切称呼
3. 突出产品卖点和性价比
4. 适当使用emoji增加趣味性
5. 结尾引导互动（点赞收藏评论）
请直接输出文案，不要添加任何标题或格式标记。`,

  taobao: `你是一位淘宝/天猫金牌文案策划。请根据图片内容，生成商品详情页文案。
要求：
1. 突出产品核心卖点
2. 使用场景化描述
3. 强调品质和性价比
4. 适合电商平台展示
请直接输出文案，不要添加任何标题或格式标记。`,

  amazon: `You are an Amazon product listing expert. Based on the image, create a compelling product description.
Requirements:
1. Highlight key features and benefits
2. Use bullet points for easy reading
3. Include relevant keywords for SEO
4. Professional tone
Please output the content directly without any titles or formatting markers.`,

  tiktok: `你是一位TikTok短视频脚本专家。请根据图片内容，生成短视频脚本。
要求：
1. 开头3秒要抓住眼球
2. 内容要有节奏感
3. 适合短视频快节奏
4. 结尾引导关注点赞
请直接输出脚本内容，不要添加任何标题或格式标记。`,
}

const PRO_AUDIO_PROMPT = `\n\n【专业模式增强】
请特别注意以下专业参数的描述：
- 声压级(SPL)和覆盖角度
- 频率响应范围
- 功放类型(D类/AB类)和功率
- 单元配置(低音/中音/高音)
- 适用场景(会议室/演出/户外等)
使用专业术语但通俗易懂的表达方式。`

async function analyzeImages(images: string[], prompt: string) {
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
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API调用失败')
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, tone, isProAudio, images, additionalInfo } = body

    if (!images || images.length === 0) {
      return NextResponse.json({ error: '请上传至少一张图片' }, { status: 400 })
    }

    let prompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.rednote

    if (isProAudio) {
      prompt += PRO_AUDIO_PROMPT
    }

    if (additionalInfo) {
      prompt += `\n\n【用户补充信息】\n${additionalInfo}`
    }

    const content = await analyzeImages(images, prompt)

    return NextResponse.json({ content })
  } catch (error: any) {
    console.error('生成失败:', error)
    return NextResponse.json({ error: error.message || '生成失败，请稍后重试' }, { status: 500 })
  }
}
