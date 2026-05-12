#!/usr/bin/env node
/**
 * StepFun Image Generation MCP Server for Claude Code
 *
 * Generates images using StepFun's step-image-edit-2 model.
 * Exposes a single `generate_image` tool via MCP protocol (stdio transport).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

// ═══════════════════════════════════════════
// 配置
// ═══════════════════════════════════════════

const STEPFUN_API_KEY = process.env.STEPFUN_API_KEY || ''
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || ''
const STEP_BASE_URL = process.env.STEP_BASE_URL || 'https://api.stepfun.com/step_plan/v1'
const DASHSCOPE_BASE_URL = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com'
const CACHE_DIR = join(homedir(), '.stepfun', 'cache', 'images')

mkdirSync(CACHE_DIR, { recursive: true })

// ═══════════════════════════════════════════
// MCP Server
// ═══════════════════════════════════════════

const server = new Server(
  { name: 'image-generation', version: '2.0.0' },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
    instructions: [
      'Multi-provider image generation tool. Supports StepFun and DashScope (通义万相).',
      '',
      'AVAILABLE MODELS MENU:',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  Provider   | Model            | Description',
      '  ───────────┼──────────────────┼────────────────────────────',
      '  stepfun    | step-image-edit-2 | 默认，中文文字渲染强',
      '  dashscope  | wan2.7-image-pro  | 万相旗舰，4K高清输出',
      '  dashscope  | wan2.7-image      | 万相快速版，生成速度快',
      '  dashscope  | z-image-turbo     | Z-Image极速版，~9步出图',
      '  dashscope  | z-image           | Z-Image基础版，质量均衡',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'USAGE RULE: When the user wants to generate an image, FIRST present',
      'this model menu above and let them choose. Then show a confirmation',
      'preview with the prompt and model, and wait for user to confirm or',
      'modify. Only call generate_image after user confirms.',
    ].join('\n'),
  },
)

// ═══════════════════════════════════════════
// StepFun API 调用
// ═══════════════════════════════════════════

async function callImagesApi(
  prompt: string,
  options: {
    cfg_scale?: number
    steps?: number
    seed?: number
    text_mode?: boolean
  },
): Promise<any> {
  // StepFun API limit: 512 characters
  const truncated = prompt.length > 512 ? prompt.slice(0, 509) + '...' : prompt

  const url = `${STEP_BASE_URL}/images/generations`
  const body = JSON.stringify({
    model: 'step-image-edit-2',
    prompt: truncated,
    response_format: 'b64_json',
    cfg_scale: options.cfg_scale ?? 1.0,
    steps: options.steps ?? 8,
    seed: options.seed ?? 0,
    text_mode: options.text_mode ?? true,
  })

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STEPFUN_API_KEY}`,
    },
    body,
    signal: AbortSignal.timeout(60_000),
  })

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => '')
    throw new Error(`StepFun API error ${resp.status}: ${errorBody}`)
  }

  return resp.json()
}

async function callDashscopeApi(
  prompt: string,
  options: {
    size?: string
    model?: string
  },
): Promise<any> {
  const truncated = prompt.length > 512 ? prompt.slice(0, 509) + '...' : prompt
  const model = options.model || 'wan2.7-image-pro'

  const url = `${DASHSCOPE_BASE_URL}/api/v1/services/aigc/multimodal-generation/generation`
  const body = JSON.stringify({
    model,
    input: {
      messages: [
        {
          role: 'user',
          content: [{ text: truncated }],
        },
      ],
    },
    parameters: {
      size: options.size || '1024*1024',
    },
  })

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body,
    signal: AbortSignal.timeout(60_000),
  })

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => '')
    throw new Error(`DashScope API error ${resp.status}: ${errorBody}`)
  }

  return resp.json()
}

// ═══════════════════════════════════════════
// MCP Tools
// ═══════════════════════════════════════════

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description:
        'Generate an image from a text prompt. First present the model menu to the user.\n\n' +
        'MODELS:\n' +
        '  stepfun (step-image-edit-2) — 中文文字渲染强\n' +
        '  dashscope wan2.7-image-pro — 万相旗舰，4K高清\n' +
        '  dashscope wan2.7-image — 万相快速版\n' +
        '  dashscope z-image-turbo — Z-Image极速版，~9步出图\n' +
        '  dashscope z-image — Z-Image基础版',
      inputSchema: {
        type: 'object' as const,
        properties: {
          prompt: {
            type: 'string',
            description:
              'Image description (max 512 chars). Describe what you want to see.',
          },
          provider: {
            type: 'string',
            enum: ['stepfun', 'dashscope'],
            description: 'API provider to use. stepfun = StepFun (default), dashscope = 通义万相.',
          },
          // StepFun-specific params
          cfg_scale: {
            type: 'number',
            description: '[StepFun] Guidance scale (higher = more literal). Default: 1.0',
          },
          steps: {
            type: 'number',
            description: '[StepFun] Generation steps (higher = more quality). Default: 8',
          },
          seed: {
            type: 'number',
            description: '[StepFun] Random seed for reproducibility. -1 = random. Default: 0',
          },
          text_mode: {
            type: 'boolean',
            description: '[StepFun] Enable Chinese text rendering. Default: true',
          },
          // DashScope-specific params
          size: {
            type: 'string',
            description:
              '[DashScope] Image size. Options: 1024*1024 (default), 720*1280, 1280*720, ' +
              '576*1024, 1024*576, 4096*4096 (wan2.7-image-pro only).',
          },
          model: {
            type: 'string',
            description:
              '[DashScope] Model name. Options: wan2.7-image-pro (default, flagship), wan2.7-image ' +
              '(faster), z-image-turbo (ultra-fast, ~9 steps), z-image.',
          },
        },
        required: ['prompt'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name } = req.params

  if (name !== 'generate_image') {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    }
  }

  const args = req.params.arguments as Record<string, any>
  const prompt = args.prompt as string
  const provider = (args.provider || 'stepfun') as string

  if (!prompt) {
    return {
      content: [{ type: 'text', text: 'Error: prompt is required' }],
      isError: true,
    }
  }

  // Check API key for selected provider
  if (provider === 'dashscope' && !DASHSCOPE_API_KEY) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: DASHSCOPE_API_KEY not configured. Set it in environment or settings.json.',
        },
      ],
      isError: true,
    }
  }
  if (provider === 'stepfun' && !STEPFUN_API_KEY) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: STEPFUN_API_KEY not configured. Set it in environment or settings.json.',
        },
      ],
      isError: true,
    }
  }

  try {
    process.stderr.write(`generate_image: [${provider}] prompt="${prompt.slice(0, 50)}..."\n`)

    let b64_image: string | undefined
    let modelUsed = ''

    if (provider === 'dashscope') {
      const result = await callDashscopeApi(prompt, {
        size: args.size,
        model: args.model,
      })
      modelUsed = result.output?.model || args.model || 'z-image-turbo'
      // DashScope response: output.choices[0].message.content[0].image (URL)
      const choice = result.output?.choices?.[0]
      const imageItem = choice?.message?.content?.find?.((c: any) => c.image)
      const imageUrl = imageItem?.image

      if (imageUrl) {
        const urlResp = await fetch(imageUrl)
        const buf = await urlResp.arrayBuffer()
        b64_image = Buffer.from(buf).toString('base64')
      }
    } else {
      const result = await callImagesApi(prompt, {
        cfg_scale: args.cfg_scale,
        steps: args.steps,
        seed: args.seed ?? -1,
        text_mode: args.text_mode,
      })
      modelUsed = 'step-image-edit-2'
      b64_image = result.data?.[0]?.b64_json
    }

    if (!b64_image) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: No image data returned from ${provider} API`,
          },
        ],
        isError: true,
      }
    }

    // Save image to cache directory
    const timestamp = Math.floor(Date.now() / 1000)
    const prefix = provider === 'dashscope' ? 'dashscope' : 'stepfun'
    const fileName = `${prefix}_${timestamp}.png`
    const filePath = join(CACHE_DIR, fileName)

    const imgBuffer = Buffer.from(b64_image, 'base64')
    writeFileSync(filePath, imgBuffer)

    process.stderr.write(`generate_image: Saved to ${filePath}\n`)

    return {
      content: [
        {
          type: 'text',
          text: `Image generated successfully!\n\nProvider: ${provider}\nModel: ${modelUsed}\nSaved to: ${filePath}`,
        },
      ],
    }
  } catch (err: any) {
    process.stderr.write(`generate_image: Error - ${err.message}\n`)
    return {
      content: [
        {
          type: 'text',
          text: `Image generation failed: ${err.message}`,
        },
      ],
      isError: true,
    }
  }
})

// ═══════════════════════════════════════════
// 启动
// ═══════════════════════════════════════════

process.stderr.write('image-gen: MCP server starting...\n')

const transport = new StdioServerTransport()
await server.connect(transport)

process.stderr.write('image-gen: MCP server connected and ready\n')
