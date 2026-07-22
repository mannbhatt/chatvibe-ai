export const FEATURE_BASE_COSTS: Record<string, number> = {
  'text_to_emoji': 1,
  'rewrite_text': 1,
  'vibe_check': 2,
  'meme_generator': 3,
};

export function getFeatureCost(featureType: string, messageCount?: number): number {
  if (featureType === 'chat_detective' || featureType === 'roast_my_chat' || featureType === 'vibe_check') {
    const count = messageCount || 0;
    if (count <= 50) return 2;
    if (count <= 150) return 4;
    if (count <= 300) return 6;
    return 9;
  }
  
  return FEATURE_BASE_COSTS[featureType] || 1; // Default fallback cost
}
