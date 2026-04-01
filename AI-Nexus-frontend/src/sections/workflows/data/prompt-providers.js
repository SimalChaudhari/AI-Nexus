import { promptCatalogService } from 'src/services/prompt-catalog.service';

/**
 * Frontend wrappers intentionally async now.
 * Data is served by backend and falls back to local JSON in service-level error handling.
 */
export async function getProviderMetadataList() {
  return promptCatalogService.getProviderMetadataList();
}

export async function getProviderPromptDetail(providerId) {
  return promptCatalogService.getProviderPromptDetail(providerId);
}
