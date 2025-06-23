/*
 * Example OAuth Provider Implementation
 * 
 * This is a template/example showing how to implement an OAuth provider
 * for the Cheese Backend OAuth system.
 */

const axios = require('axios');

class ExampleOAuthProvider {
  constructor(config) {
    this.config = {
      ...config,
      authorizationUrl: 'https://example.com/oauth/authorize', // 替换为实际的授权 URL
      tokenUrl: 'https://example.com/oauth/token',             // 替换为实际的 token URL
      scope: ['read:user', 'user:email'],                     // 替换为实际需要的权限
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

    if (state) {
      params.append('state', state);
    }

    if (accessType) {
      params.append('access_type', accessType);
    }

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  async handleCallback(code, state) {
    try {
      const response = await axios.post(this.config.tokenUrl, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUrl,
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (response.data && response.data.access_token) {
        return response.data.access_token;
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error.message}`);
    }
  }

  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://example.com/api/user', { // 替换为实际的用户信息 API
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      const userData = response.data;
      
      // 将提供商的用户数据转换为标准格式
      return {
        id: userData.id.toString(),
        email: userData.email,
        name: userData.name,
        username: userData.login || userData.username,
        preferredUsername: userData.preferred_username || userData.login || userData.username,
      };
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }
}

// 导出创建函数
function createProvider(config) {
  return new ExampleOAuthProvider(config);
}

module.exports = { createProvider, default: createProvider };