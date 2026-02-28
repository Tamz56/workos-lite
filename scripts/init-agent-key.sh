#!/bin/bash
KEY="5c9e0061aadbbecb85cdd2a43b7918ab5a171ce661ef87846e9df21fead90e13"
HASH=$(echo -n "$KEY" | shasum -a 256 | awk '{print $1}')
SCOPES='["tasks:read", "tasks:write", "docs:read", "docs:write", "events:read", "events:write", "attachments:read", "attachments:write"]'

sqlite3 data/workos.db "
INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled)
VALUES ('agent_root', 'Root Agent', '$HASH', '$SCOPES', 1)
ON CONFLICT(name) DO UPDATE SET 
  key_hash=excluded.key_hash,
  scopes_json=excluded.scopes_json,
  is_enabled=1;
"

echo "✅ Agent key successfully configured in the database!"
echo "Current keys:"
sqlite3 -header -column data/workos.db "SELECT id, name, is_enabled, scopes_json FROM agent_keys;"
