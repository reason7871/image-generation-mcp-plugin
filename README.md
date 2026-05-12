# Image Generation MCP Plugin

多平台 AI 图像生成插件，为 Claude Code 提供生图能力。支持 StepFun 和阿里云通义万相（DashScope）。

## 功能特性

- **多模型支持**：
  - StepFun `step-image-edit-2` - 中文文字渲染强
  - DashScope `wan2.7-image-pro` - 万相旗舰，4K 高清输出
  - DashScope `wan2.7-image` - 万相快速版
  - DashScope `z-image-turbo` - Z-Image 极速版，~9 步出图
  - DashScope `z-image` - Z-Image 基础版

- **交互式工作流**：
  1. 选择模型（显示菜单）
  2. 确认提示词和模型
  3. 生成图片

## 安装

### 从 GitHub 安装

```bash
# 方法 1: 使用 claude plugin add 命令
claude plugin add https://github.com/reason7871/image-generation-mcp-plugin

# 方法 2: 手动添加到 ~/.claude/settings.json
{
  "extraKnownMarketplaces": {
    "image-generation-mcp": {
      "source": {
        "source": "github",
        "repo": "reason7871/image-generation-mcp-plugin"
      }
    }
  },
  "enabledPlugins": {
    "image-generation-mcp@image-generation-mcp": true
  }
}
```

### 从本地安装（开发）

```bash
node install.js
```

## 配置

安装后需要配置 API Key（在 `~/.claude/settings.json` 的 `env` 中添加）：

```json
{
  "env": {
    "STEPFUN_API_KEY": "your_stepfun_api_key",
    "DASHSCOPE_API_KEY": "your_dashscope_api_key"
  }
}
```

**获取 API Key：**
- StepFun API Key：前往 https://api.stepfun.com 获取
- DashScope API Key：前往 https://dashscope.console.aliyun.com 获取

## 使用方法

在 Claude Code 中：

```
帮我生成一张杭州西湖的图片
```

Claude 会先让你选择模型，确认后再生成。

## 手动安装步骤

1. 克隆仓库：
   ```bash
   git clone https://github.com/reason7871/image-generation-mcp-plugin.git
   cd image-generation-mcp-plugin
   ```

2. 安装依赖并编译：
   ```bash
   npm install
   npm run build
   ```

3. 运行安装脚本：
   ```bash
   node install.js
   ```

## 文件结构

```
image-generation-mcp-plugin/
├── .claude-plugin/
│   ├── manifest.json       # 插件清单
│   └── marketplace.json    # 市场配置
├── src/
│   └── index.ts            # MCP Server 源码
├── dist/
│   └── index.js            # 编译后的代码（npm run build 生成）
├── install.js              # 安装脚本
├── uninstall.js            # 卸载脚本
├── package.json
└── README.md
```

## 卸载

```bash
node uninstall.js
```

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 本地测试
node dist/index.js
```

## License

MIT

## 致谢

基于 [OpenWolf](https://github.com/anthropics/claude-code) 项目开发。
