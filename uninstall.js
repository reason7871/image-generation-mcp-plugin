#!/usr/bin/env node
/**
 * Image Generation MCP Plugin - Uninstall Script
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'

const USER_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')
const MARKETPLACE_NAME = 'image-generation-mcp'
const PLUGIN_ID = `${MARKETPLACE_NAME}@${MARKETPLACE_NAME}`

console.log('🗑️  Image Generation MCP Plugin 卸载程序\n')

if (!existsSync(USER_SETTINGS_PATH)) {
  console.log(`❌ 未找到配置文件：${USER_SETTINGS_PATH}`)
  process.exit(1)
}

const settings = JSON.parse(readFileSync(USER_SETTINGS_PATH, 'utf-8'))

// 删除 marketplace
if (settings.extraKnownMarketplaces?.[MARKETPLACE_NAME]) {
  delete settings.extraKnownMarketplaces[MARKETPLACE_NAME]
  console.log(`✅ 删除 marketplace: ${MARKETPLACE_NAME}`)
}

// 删除插件
if (settings.enabledPlugins?.[PLUGIN_ID]) {
  delete settings.enabledPlugins[PLUGIN_ID]
  console.log(`✅ 删除插件：${PLUGIN_ID}`)
}

// 删除插件配置
if (settings.pluginConfigs?.[MARKETPLACE_NAME]) {
  delete settings.pluginConfigs[MARKETPLACE_NAME]
  console.log(`✅ 删除插件配置`)
}

writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n')

console.log('\n✅ 卸载完成！重启 Claude Code 生效。\n')
