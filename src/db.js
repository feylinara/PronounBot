const { readdirSync, readFileSync, openSync } = require('fs');
const { Pool } = require('pg');

const loadQueries = () => {
  const dir = readdirSync('./sql', 'utf8');
  const queries = {};
  for (const file of dir) {
    if (file.endsWith('.sql')) {
      queries[file.substring(0, file.length - '.sql'.length)] = readFileSync(openSync('./sql/' + file), 'utf8');
    }
  }
  return queries;
};

class Database {
  constructor() {
    this.db = new Pool();
    this.queries = loadQueries();
  }

  async getServerSettings(guildId) {
    const queryString = this.queries['server-settings.get'];
    const configResult = await this.db.query(queryString, [guildId]);
    return configResult.rows.length != 0 ? {
      prefix: configResult.rows[0].prefix.trim(),
      primaryLanguage: configResult.rows[0].primary_language.trim(),
      abuseProtect: configResult.rows[0].abuse_protect,
    } : null;
  }

  initServerSettings(guildId, defaultPrefix, defaultLanguage) {
    const queryString = this.queries['server-settings.init'];
    return this.db.query(queryString, [guildId, defaultPrefix, defaultLanguage]);
  }

  async getLanguage(name) {
    const queryString = this.queries['language.get'];
    let result = await this.db.query(queryString, [name]);
    return result.rows;
  }

  updatePrimaryLanguage(guildId, language) {
    const queryString = this.queries['server-settings.primary-language.update'];
    return this.db.query(queryString, [guildId, language]);
  }

  updatePrefix(guildId, prefix) {
    const queryString = this.queries['server-settings.prefix.update'];
    return this.db.query(queryString, [guildId, prefix]);
  }

  async getPronouns(cases, language) {
    const queryString = this.queries[`pronouns${cases.length}.get`];
    const rows = (await this.db.query(queryString, [language].concat(cases))).rows;

    return rows;
  }
}

module.exports = { Database };
