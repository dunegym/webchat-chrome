// ============= Storage Layer =============
// chrome.storage.local 封装层，提供会话和设置的 CRUD 操作

const Storage = {
  // ---------- Settings ----------
  async getSettings() {
    const result = await chrome.storage.local.get('settings');
    return result.settings || { ...DEFAULT_SETTINGS };
  },

  async saveSettings(settings) {
    await chrome.storage.local.set({ settings });
  },

  // ---------- Sessions ----------
  async getSessions() {
    const result = await chrome.storage.local.get('sessions');
    return result.sessions || [];
  },

  async saveSessions(sessions) {
    await chrome.storage.local.set({ sessions });
  },

  async getSession(id) {
    const sessions = await this.getSessions();
    return sessions.find((s) => s.id === id) || null;
  },

  async saveSession(session) {
    const sessions = await this.getSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }
    await this.saveSessions(sessions);
  },

  async deleteSession(id) {
    const sessions = await this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    await this.saveSessions(filtered);
  },

  async getCurrentSessionId() {
    const result = await chrome.storage.local.get('currentSessionId');
    return result.currentSessionId || null;
  },

  async setCurrentSessionId(id) {
    await chrome.storage.local.set({ currentSessionId: id });
  },

  // ---------- Storage Change Listener ----------
  onChanged(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        callback(changes);
      }
    });
  },

  // ---------- Helpers ----------
  generateId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${timestamp}-${random}`;
  },
};
