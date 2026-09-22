class AIAssistant {
  constructor(catalog) {
    this.catalog = catalog;
  }

  generateResponse(prompt) {
    const lowerPrompt = prompt.toLowerCase();
    let selectedTracks = [];
    let message = '';

    if (lowerPrompt.includes('energetic') || lowerPrompt.includes('workout') || lowerPrompt.includes('party')) {
      selectedTracks = this.catalog.filter(t => t.genre === 'Synthwave' || t.genre === 'Electronic');
      message = "I've queued up some high-energy tracks to get the party started! 🔥";
    } else if (lowerPrompt.includes('chill') || lowerPrompt.includes('study') || lowerPrompt.includes('relax')) {
      selectedTracks = this.catalog.filter(t => t.genre === 'Lo-Fi' || t.genre === 'Ambient');
      message = "Here are some chill vibes for you to relax to. ☕";
    } else {
      // Default mix
      selectedTracks = [...this.catalog].sort(() => 0.5 - Math.random()).slice(0, 2);
      message = "I've picked a great mix for you! 🎵";
    }

    return { message, tracks: selectedTracks };
  }
}

module.exports = { AIAssistant };
