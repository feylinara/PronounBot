const { readdirSync, readFileSync, openSync } = require('fs');
const { normaliseId } = require('./util.js');
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
    const result = await this.db.query(queryString, [name]);
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

  registerRole(role) {
    const queryString = this.queries['role-protect.add'];
    return this.db.query(queryString, [normaliseId(role.guild), role.name]);
  }

  unregisterRole(role) {
    const queryString = this.queries['role-protect.delete'];
    return this.db.query(queryString, [normaliseId(role.guild), role.name]);
  }

  async isRegistered(role) {
    const queryString = this.queries['role-protect.get'];
    const result = await this.db.query(queryString, [normaliseId(role.guild), role.name]);
    return result.rows.length != 0;
  }

  listPronouns(language) {
    const queryString = this.queries['pronouns.list'];
    return this.db.query(queryString, [language]);
  }

  countPronouns() {
    const queryString = this.queries['language.list'];
    return this.db.query(queryString, []);
  }
}

module.exports = { Database };
