#!/usr/bin/env node
/**
 * Image Generation MCP Plugin - Install Script
 *
 * 使用方法：
 *   node install.js
 *
 * 会自动将插件添加到 ~/.claude/settings.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const USER_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')
const PLUGIN_PATH = 'E:/CLAUDE_itme/image-generation-mcp-plugin'
const MARKETPLACE_NAME = 'image-generation-mcp'

console.log('🔧 Image Generation MCP Plugin 安装程序\n')

// 检查 settings.json 是否存在
if (!existsSync(USER_SETTINGS_PATH)) {
  console.log(`❌ 未找到用户配置文件：${USER_SETTINGS_PATH}`)
  console.log('请先运行一次 Claude Code 来创建配置文件')
  process.exit(1)
}

// 读取 settings.json
let settings
try {
  const content = readFileSync(USER_SETTINGS_PATH, 'utf-8')
  settings = JSON.parse(content)
} catch (err) {
  console.log(`❌ 读取 settings.json 失败：${err.message}`)
  process.exit(1)
}

// 添加 marketplace
if (!settings.extraKnownMarketplaces) {
  settings.extraKnownMarketplaces = {}
}

if (settings.extraKnownMarketplaces[MARKETPLACE_NAME]) {
  console.log(`ℹ️  Marketplace "${MARKETPLACE_NAME}" 已存在`)
} else {
  settings.extraKnownMarketplaces[MARKETPLACE_NAME] = {
    source: {
      source: 'directory',
      path: PLUGIN_PATH
    }
  }
  console.log(`✅ 添加 marketplace: ${MARKETPLACE_NAME}`)
}

// 添加插件到 enabledPlugins
if (!settings.enabledPlugins) {
  settings.enabledPlugins = {}
}

const PLUGIN_ID = `${MARKETPLACE_NAME}@${MARKETPLACE_NAME}`
if (settings.enabledPlugins[PLUGIN_ID]) {
  console.log(`ℹ️  插件 "${PLUGIN_ID}" 已启用`)
} else {
  settings.enabledPlugins[PLUGIN_ID] = true
  console.log(`✅ 启用插件：${PLUGIN_ID}`)
}

// 添加 pluginConfigs（API Key 配置）
if (!settings.pluginConfigs) {
  settings.pluginConfigs = {}
}

if (!settings.pluginConfigs[MARKETPLACE_NAME]) {
  settings.pluginConfigs[MARKETPLACE_NAME] = {
    mcpServers: {
      'image-generation': {}
    }
  }
  console.log(`✅ 创建插件配置`)
}

// 检查是否已有 API Key
const existingStepfun = settings.env?.STEPFUN_API_KEY
const existingDashscope = settings.env?.DASHSCOPE_API_KEY

if (existingStepfun) {
  settings.pluginConfigs[MARKETPLACE_NAME].mcpServers['image-generation'].STEPFUN_API_KEY = existingStepfun
  console.log(`ℹ️  从全局 env 导入 STEPFUN_API_KEY`)
} else {
  console.log(`⚠️  未找到 STEPFUN_API_KEY，请在配置中添加`)
}

if (existingDashscope) {
  settings.pluginConfigs[MARKETPLACE_NAME].mcpServers['image-generation'].DASHSCOPE_API_KEY = existingDashscope
  console.log(`ℹ️  从全局 env 导入 DASHSCOPE_API_KEY`)
} else {
  console.log(`⚠️  未找到 DASHSCOPE_API_KEY，请在配置中添加`)
}

// 写入 settings.json
try {
  writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')
  console.log(`✅ 已更新：${USER_SETTINGS_PATH}`)
} catch (err) {
  console.log(`❌ 写入 settings.json 失败：${err.message}`)
  process.exit(1)
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ 安装完成！\n')
console.log('下一步：')
console.log('1. 重启 Claude Code')
console.log('2. 运行 /skills 查看已安装的插件')
console.log('3. 如果没有 API Key，在 ~/.claude/settings.json 的 env 中添加：')
console.log('   "env": {')
console.log('     "STEPFUN_API_KEY": "your_stepfun_key",')
console.log('     "DASHSCOPE_API_KEY": "your_dashscope_key"')
console.log('   }')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
