export function parseWhatsAppDate(timestampStr: string): number {
  try {
    const parts = timestampStr.match(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)(?::\d+)?\s?(am|pm|AM|PM)?/);
    if (!parts) return 0;
    
    let [_, d, m, y, h, min, ampm] = parts;
    let year = parseInt(y, 10);
    if (year < 100) year += 2000;
    
    let hour = parseInt(h, 10);
    if (ampm && ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
    
    const date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10), hour, parseInt(min, 10));
    return date.getTime();
  } catch(e) {
    return 0;
  }
}

export function computeStats(messages: any[], participants: string[]) {
  const stats: any = {};
  
  participants.forEach(p => {
    stats[p] = {
      messageCount: 0,
      totalWords: 0,
      totalEmojis: 0,
      questionCount: 0,
      longestGapMins: 0,
      totalResponseTimeMins: 0,
      responseCount: 0
    };
  });

  const totalMessages = messages.length;
  let lastMessageTime = 0;
  let lastSender = '';

  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

  messages.forEach(msg => {
    const p = msg.sender;
    if (!stats[p]) return;
    
    stats[p].messageCount++;
    stats[p].totalWords += (msg.message || '').split(/\s+/).filter((w: string) => w.length > 0).length;
    stats[p].totalEmojis += ((msg.message || '').match(emojiRegex) || []).length;
    if ((msg.message || '').includes('?')) stats[p].questionCount++;
    
    const time = parseWhatsAppDate(msg.timestamp);
    if (time > 0 && lastMessageTime > 0 && lastSender && lastSender !== p) {
      const gapMins = Math.round((time - lastMessageTime) / 60000);
      if (gapMins >= 0 && gapMins < 60 * 24 * 30) {
        stats[p].responseCount++;
        stats[p].totalResponseTimeMins += gapMins;
        if (gapMins > stats[p].longestGapMins) {
          stats[p].longestGapMins = gapMins;
        }
      }
    }
    
    if (time > 0) {
      lastMessageTime = time;
      lastSender = p;
    }
  });

  const finalStats: any = {};
  participants.forEach(p => {
    const s = stats[p];
    finalStats[p] = {
      messagePercentage: totalMessages > 0 ? Math.round((s.messageCount / totalMessages) * 100) : 0,
      averageMessageLengthWords: s.messageCount > 0 ? Math.round(s.totalWords / s.messageCount) : 0,
      totalEmojis: s.totalEmojis,
      questionCount: s.questionCount,
      averageResponseGapMins: s.responseCount > 0 ? Math.round(s.totalResponseTimeMins / s.responseCount) : 0,
      longestResponseGapMins: s.longestGapMins
    };
  });

  return finalStats;
}
