type ProviderLookupDb = {
    prepare(sql: string): { get(...params: unknown[]): unknown };
};

export function aiProviderExists(db: ProviderLookupDb, providerKey: string | null | undefined) {
    if (!providerKey) return true;
    return Boolean(db.prepare("SELECT id FROM ai_resource_profiles WHERE provider_key = ?").get(providerKey));
}
