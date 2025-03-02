/**
 * Enhanced NLP processor to analyze user input for specific patterns
 * and sentiments relevant to the Trump-Zelensky negotiation
 */
export const analyzeText = async (text) => {
  const lowerText = text.toLowerCase();
  
  // Analyze for explicit commitments regarding Biden investigation
  const explicitCommitment = 
    lowerText.includes('investigate biden') || 
    lowerText.includes('look into biden') || 
    lowerText.includes('biden investigation') ||
    lowerText.includes('investigate corruption') ||
    (lowerText.includes('investigate') && lowerText.includes('burisma'));
  
  // Count compliments
  const complimentPatterns = [
    'great', 'amazing', 'wonderful', 'strong leader', 
    'best president', 'smart', 'genius', 'thank you',
    'appreciate', 'admire', 'respect', 'tremendous',
    'honored', 'grateful', 'exceptional', 'outstanding'
  ];
  const complimentCount = complimentPatterns.reduce((count, pattern) => {
    return count + (lowerText.includes(pattern) ? 1 : 0);
  }, 0);
  
  // Check for resistance
  const resistancePatterns = [
    'cannot', 'won\'t', 'will not', 'impossible', 
    'against policy', 'illegal', 'inappropriate', 'no',
    'refuse', 'reject', 'unfair', 'unreasonable',
    'not possible', 'unacceptable', 'disagree'
  ];
  const resistanceCount = resistancePatterns.reduce((count, pattern) => {
    return count + (lowerText.includes(pattern) ? 1 : 0);
  }, 0);
  
  // Check for whistleblower risk phrases
  const riskPhrases = [
    'this call is being recorded', 
    'will be public',
    'whistleblower',
    'illegal request',
    'impeachment',
    'quid pro quo',
    'investigation into this',
    'transcript',
    'ethics violation',
    'constitution'
  ].reduce((count, phrase) => {
    return count + (lowerText.includes(phrase) ? 1 : 0);
  }, 0);
  
  // Check for media alignment
  const mediaAlignment = 
    lowerText.includes('fox news') || 
    lowerText.includes('interview') || 
    lowerText.includes('press conference') ||
    lowerText.includes('statement to media') ||
    lowerText.includes('public announcement') ||
    lowerText.includes('television') ||
    lowerText.includes('press release');
  
  // Analyze for promising aid without commitments (Zelensky winning)
  const aidWithoutCommitment = 
    (lowerText.includes('release aid') || lowerText.includes('send aid') || lowerText.includes('provide aid')) &&
    !explicitCommitment;
  
  // Calculate relational and risk scores
  const relationScore = (complimentCount * 5) - (resistanceCount * 3);
  const riskScore = (mediaAlignment ? 25 : 0) - (riskPhrases * 15);
  
  return {
    explicitCommitment,
    complimentCount,
    resistanceCount,
    riskPhrases,
    mediaAlignment,
    relationScore,
    riskScore,
    aidWithoutCommitment
  };
};
