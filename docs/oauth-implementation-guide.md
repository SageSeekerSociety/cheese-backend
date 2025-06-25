# OAuth 功能实现指南

## 概述

本文档描述了 Cheese Backend 中 OAuth 登录功能的实现。该功能允许用户使用第三方 OAuth 提供商（如学校的 OAuth 系统）进行登录。

## 核心组件

### 1. OAuth Service (`src/auth/oauth/oauth.service.ts`)
- 动态加载和管理多个 OAuth 提供商
- 支持插件机制和 npm 包加载
- 提供统一的 OAuth 流程接口

### 2. OAuth 类型定义 (`src/auth/oauth/oauth.types.ts`)
- `OAuthProvider` 接口：定义提供商必须实现的方法
- `BaseOAuthProvider` 抽象类：提供通用实现
- `OAuthUserInfo` 接口：标准化用户信息格式

### 3. 数据库模型 (`src/auth/oauth/oauth.prisma`)
- `UserOAuthConnection` 模型：存储用户与第三方账号的关联关系

### 4. 控制器路由 (`src/users/users.controller.ts`)
- `GET /users/auth/oauth/providers` - 获取可用的 OAuth 提供商列表
- `GET /users/auth/oauth/login/:providerId` - 重定向到 OAuth 提供商授权页面
- `GET /users/auth/oauth/callback/:providerId` - 处理 OAuth 回调

## 环境配置

在 `.env` 文件中添加以下配置：

```bash
# 启用的 OAuth 提供商（逗号分隔）
OAUTH_ENABLED_PROVIDERS=ruc,google

# OAuth 插件搜索路径
OAUTH_PLUGIN_PATHS=plugins/oauth

# 是否允许从 npm 包加载提供商
OAUTH_ALLOW_NPM_LOADING=false

# 提供商凭据（以 'ruc' 为例）
OAUTH_RUC_CLIENT_ID=your-client-id
OAUTH_RUC_CLIENT_SECRET=your-client-secret
OAUTH_RUC_REDIRECT_URL=http://localhost:3000/users/auth/oauth/callback/ruc

# 前端重定向路径
FRONTEND_OAUTH_SUCCESS_PATH=/oauth-success
FRONTEND_OAUTH_ERROR_PATH=/oauth-error
```

## 实现新的 OAuth 提供商

### 方法一：插件文件

在 `plugins/oauth/` 目录下创建提供商实现文件：

```javascript
// plugins/oauth/your-provider.js
const axios = require('axios');

class YourOAuthProvider {
  constructor(config) {
    this.config = {
      ...config,
      authorizationUrl: 'https://your-provider.com/oauth/authorize',
      tokenUrl: 'https://your-provider.com/oauth/token',
      scope: ['read:user', 'user:email'],
    };
  }

  getConfig() {
    return this.config;
  }

  getAuthorizationUrl(state, accessType) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUrl,
      scope: this.config.scope.join(' '),
      response_type: 'code',
    });

    if (state) params.append('state', state);
    if (accessType) params.append('access_type', accessType);

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async handleCallback(code, state) {
    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUrl,
    });

    return response.data.access_token;
  }

  async getUserInfo(accessToken) {
    const response = await axios.get('https://your-provider.com/api/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const userData = response.data;
    return {
      id: userData.id.toString(),
      email: userData.email,
      name: userData.name,
      username: userData.username,
      preferredUsername: userData.preferred_username,
    };
  }
}

function createProvider(config) {
  return new YourOAuthProvider(config);
}

module.exports = { createProvider, default: createProvider };
```

### 方法二：TypeScript 实现

```typescript
// plugins/oauth/your-provider.ts
import axios from 'axios';
import { BaseOAuthProvider, OAuthProviderConfig, OAuthUserInfo } from '../../src/auth/oauth/oauth.types';

export class YourOAuthProvider extends BaseOAuthProvider {
  constructor(config: OAuthProviderConfig) {
    super({
      ...config,
      authorizationUrl: 'https://your-provider.com/oauth/authorize',
      tokenUrl: 'https://your-provider.com/oauth/token',
      scope: ['read:user', 'user:email'],
    });
  }

  async handleCallback(code: string, state?: string): Promise<string> {
    const response = await axios.post(this.config.tokenUrl, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUrl,
    });

    return response.data.access_token;
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await axios.get('https://your-provider.com/api/user', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const userData = response.data;
    return {
      id: userData.id.toString(),
      email: userData.email,
      name: userData.name,
      username: userData.username,
      preferredUsername: userData.preferred_username,
    };
  }
}

export function createProvider(config: OAuthProviderConfig) {
  return new YourOAuthProvider(config);
}
```

## OAuth 流程

1. **用户点击 OAuth 登录**
   - 前端调用 `GET /users/auth/oauth/providers` 获取可用提供商
   - 前端引导用户访问 `GET /users/auth/oauth/login/:providerId`

2. **重定向到提供商**
   - 后端生成授权 URL 并重定向用户到 OAuth 提供商

3. **用户授权并回调**
   - 用户在提供商页面完成授权
   - 提供商重定向用户到 `GET /users/auth/oauth/callback/:providerId`

4. **处理回调**
   - 后端交换 authorization code 获取 access token
   - 使用 access token 获取用户信息
   - 根据用户信息进行登录或注册
   - 生成 JWT token 并重定向到前端

5. **用户登录成功**
   - 前端从 URL 参数获取 JWT token
   - 从 Cookie 获取 refresh token
   - 完成登录状态设置

## 用户同步逻辑

### 1. 检查已有绑定
- 查询 `UserOAuthConnection` 表，查找是否已有该提供商和用户 ID 的绑定
- 如果找到且关联用户未被删除，直接登录

### 2. 按邮箱匹配现有用户
- 如果未找到绑定但 OAuth 提供了邮箱
- 查找本地是否有相同邮箱的活跃用户
- 如果找到，创建新的 OAuth 绑定并登录

### 3. 创建新用户
- 如果既无绑定又无邮箱匹配，创建新用户
- 生成唯一用户名（基于 OAuth 用户信息）
- 创建用户、用户档案和 OAuth 绑定
- 生成随机密码（用户不会使用）

## 安全考虑

1. **State 参数验证**
   - OAuth 流程中的 state 参数用于防止 CSRF 攻击
   - 建议在生产环境中实现 state 验证

2. **路径遍历防护**
   - 插件加载时验证路径安全性
   - 只允许加载预期目录下的文件

3. **配置验证**
   - 验证提供商 ID 只包含安全字符
   - 检查必要配置项的存在

4. **错误处理**
   - 统一的错误处理和日志记录
   - 不泄露敏感信息给前端

## 扩展功能

### 添加新提供商支持
1. 实现提供商类（参考上面的示例）
2. 将实现文件放在 `plugins/oauth/` 目录
3. 在环境变量中配置提供商凭据
4. 将提供商 ID 添加到 `OAUTH_ENABLED_PROVIDERS`

### 自定义用户信息映射
在提供商实现的 `getUserInfo` 方法中，可以自定义如何将提供商的用户数据映射到标准的 `OAuthUserInfo` 格式。

### 长期令牌管理
可以在 `UserOAuthConnection` 表中存储 OAuth refresh token，用于长期访问第三方 API（如果需要）。

## 前端集成

前端需要实现以下页面：

1. **登录页面**
   - 调用 `/users/auth/oauth/providers` 获取提供商列表
   - 为每个提供商提供登录按钮

2. **OAuth 成功页面** (`/oauth-success`)
   - 从 URL 参数获取 `token` 和 `email`
   - 设置应用登录状态

3. **OAuth 错误页面** (`/oauth-error`)
   - 显示错误信息
   - 提供重新登录选项

## 故障排除

### 常见问题

1. **提供商未加载**
   - 检查环境变量配置
   - 确认插件文件路径和格式正确
   - 查看应用启动日志

2. **回调失败**
   - 确认回调 URL 配置正确
   - 检查提供商的 client credentials
   - 查看错误日志了解具体失败原因

3. **用户信息获取失败**
   - 检查用户信息 API 的 URL 和权限要求
   - 确认 access token 有效且有足够权限

### 调试技巧

1. 启用详细日志记录
2. 使用 OAuth 提供商的开发者工具
3. 检查网络请求和响应
4. 验证 JWT token 的内容和有效性