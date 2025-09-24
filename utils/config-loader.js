// Configuration loader utility
const fs = require('fs');
const path = require('path');

class ConfigLoader {
  static instance = null;
  config = null;

  static getInstance() {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  loadConfig() {
    if (!this.config) {
      const configPath = path.join(__dirname, '../fixtures/tlr-config.json');
      try {
        const configData = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(configData).testConfig;
      } catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
      }
    }
    return this.config;
  }

  getUrls() {
    return this.loadConfig().urls;
  }

  getCredentials(type = 'demo') {
    return this.loadConfig().credentials[type];
  }

  getSelectors(section) {
    const config = this.loadConfig();
    return section ? config.selectors[section] : config.selectors;
  }

  getTimeouts() {
    return this.loadConfig().timeouts;
  }

  getTestData() {
    return this.loadConfig().testData;
  }

  getValidation() {
    return this.loadConfig().validation;
  }
}

module.exports = ConfigLoader;