'use strict';

const PROFILE_FIELDS = [
  'toolProfile',
  'enabledToolCategories',
  'disabledToolCategories',
  'enabledTools',
  'disabledTools',
];

function normalizeProfileName(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error('profile name is required.');
  }
  return normalized.slice(0, 80);
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizeProfileMode(value) {
  const normalized = String(value || 'core').trim().toLowerCase();
  return normalized === 'full' || normalized === 'custom' ? normalized : 'core';
}

function normalizeToolProfile(value) {
  const profile = value || {};
  return {
    name: normalizeProfileName(profile.name),
    toolProfile: normalizeProfileMode(profile.toolProfile),
    enabledToolCategories: normalizeStringList(profile.enabledToolCategories).map((item) => item.toLowerCase()),
    disabledToolCategories: normalizeStringList(profile.disabledToolCategories).map((item) => item.toLowerCase()),
    enabledTools: normalizeStringList(profile.enabledTools),
    disabledTools: normalizeStringList(profile.disabledTools),
    updatedAt: profile.updatedAt ? String(profile.updatedAt) : new Date().toISOString(),
  };
}

function normalizeSavedToolProfiles(value) {
  const profiles = [];
  const seen = new Set();
  for (const item of Array.isArray(value) ? value : []) {
    try {
      const profile = normalizeToolProfile(item);
      const key = profile.name.toLowerCase();
      if (seen.has(key)) {
        const index = profiles.findIndex((existing) => existing.name.toLowerCase() === key);
        profiles[index] = profile;
      } else {
        seen.add(key);
        profiles.push(profile);
      }
    } catch (error) {
      // Ignore malformed saved profile entries rather than breaking extension startup.
    }
  }
  return profiles.sort((left, right) => left.name.localeCompare(right.name));
}

function createToolProfileSnapshot(config = {}, name) {
  return normalizeToolProfile({
    name,
    toolProfile: config.toolProfile,
    enabledToolCategories: config.enabledToolCategories,
    disabledToolCategories: config.disabledToolCategories,
    enabledTools: config.enabledTools,
    disabledTools: config.disabledTools,
  });
}

function upsertToolProfile(savedProfiles, profile) {
  const normalized = normalizeToolProfile(profile);
  const profiles = normalizeSavedToolProfiles(savedProfiles);
  const key = normalized.name.toLowerCase();
  const index = profiles.findIndex((item) => item.name.toLowerCase() === key);
  if (index >= 0) {
    profiles[index] = normalized;
  } else {
    profiles.push(normalized);
  }
  return normalizeSavedToolProfiles(profiles);
}

function deleteToolProfile(savedProfiles, name) {
  const key = normalizeProfileName(name).toLowerCase();
  return normalizeSavedToolProfiles(savedProfiles)
    .filter((profile) => profile.name.toLowerCase() !== key);
}

function findToolProfile(savedProfiles, name) {
  const key = normalizeProfileName(name).toLowerCase();
  return normalizeSavedToolProfiles(savedProfiles)
    .find((profile) => profile.name.toLowerCase() === key) || null;
}

function applyToolProfile(config = {}, profile) {
  const normalized = normalizeToolProfile(profile);
  const next = { ...config };
  for (const field of PROFILE_FIELDS) {
    next[field] = Array.isArray(normalized[field])
      ? normalized[field].slice()
      : normalized[field];
  }
  next.activeToolProfileName = normalized.name;
  return next;
}

function exportToolProfiles(savedProfiles) {
  return {
    version: 1,
    profiles: normalizeSavedToolProfiles(savedProfiles),
  };
}

function parseProfileImportPayload(payload) {
  if (typeof payload === 'string') {
    return JSON.parse(payload);
  }
  return payload || {};
}

function importToolProfiles(savedProfiles, payload, options = {}) {
  const parsed = parseProfileImportPayload(payload);
  const incoming = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.profiles)
      ? parsed.profiles
      : [];
  if (!incoming.length) {
    throw new Error('No tool profiles found in import payload.');
  }

  const base = options.replace ? [] : normalizeSavedToolProfiles(savedProfiles);
  return incoming.reduce((profiles, profile) => upsertToolProfile(profiles, profile), base);
}

module.exports = {
  applyToolProfile,
  createToolProfileSnapshot,
  deleteToolProfile,
  exportToolProfiles,
  findToolProfile,
  importToolProfiles,
  normalizeSavedToolProfiles,
  normalizeToolProfile,
  upsertToolProfile,
};
