import { MarketScenario, TimeOfDay, MarketSimulatorConfig } from './marketSimulator';

/**
 * Pre-defined market simulator configurations for different scenarios
 */

/**
 * Normal market conditions
 * - Moderate volatility
 * - Strong correlations
 * - Low flash event probability
 */
export const NORMAL_MARKET: MarketSimulatorConfig = {
  updateFrequencyMs: 1000,
  volatilityFactor: 0.2,
  correlationStrength: 0.7,
  scenario: MarketScenario.NORMAL,
  timeOfDay: TimeOfDay.MORNING,
  flashEventProbability: 0.001,
  flashEventMagnitude: 3.0,
};

/**
 * High volatility market conditions
 * - High volatility
 * - Decreased correlations
 * - Higher flash event probability
 */
export const HIGH_VOLATILITY: MarketSimulatorConfig = {
  updateFrequencyMs: 500,
  volatilityFactor: 0.8,
  correlationStrength: 0.5,
  scenario: MarketScenario.HIGH_VOLATILITY,
  timeOfDay: TimeOfDay.MORNING,
  flashEventProbability: 0.01,
  flashEventMagnitude: 5.0,
};

/**
 * Trending market conditions - upward trend
 * - Moderate volatility
 * - Strong correlations
 * - Trending upward price movements
 */
export const TRENDING_UP: MarketSimulatorConfig = {
  updateFrequencyMs: 800,
  volatilityFactor: 0.3,
  correlationStrength: 0.8,
  scenario: MarketScenario.TRENDING_UP,
  timeOfDay: TimeOfDay.MORNING,
  flashEventProbability: 0.002,
  flashEventMagnitude: 2.5,
};

/**
 * Trending market conditions - downward trend
 * - Moderate volatility
 * - Strong correlations
 * - Trending downward price movements
 */
export const TRENDING_DOWN: MarketSimulatorConfig = {
  updateFrequencyMs: 800,
  volatilityFactor: 0.3,
  correlationStrength: 0.8,
  scenario: MarketScenario.TRENDING_DOWN,
  timeOfDay: TimeOfDay.MORNING,
  flashEventProbability: 0.005,
  flashEventMagnitude: 3.5,
};

/**
 * Flash crash scenario
 * - Very high volatility
 * - Reduced correlations (chaotic behavior)
 * - High flash event probability
 * - Fast updates
 */
export const FLASH_CRASH: MarketSimulatorConfig = {
  updateFrequencyMs: 200,
  volatilityFactor: 1.2,
  correlationStrength: 0.3,
  scenario: MarketScenario.FLASH_EVENT,
  timeOfDay: TimeOfDay.MARKET_OPEN,
  flashEventProbability: 0.1,
  flashEventMagnitude: 8.0,
};

/**
 * Market open scenario
 * - High volatility
 * - Fast updates
 * - Normal correlations
 */
export const MARKET_OPEN: MarketSimulatorConfig = {
  updateFrequencyMs: 300,
  volatilityFactor: 0.5,
  correlationStrength: 0.7,
  scenario: MarketScenario.NORMAL,
  timeOfDay: TimeOfDay.MARKET_OPEN,
  flashEventProbability: 0.005,
  flashEventMagnitude: 3.0,
};

/**
 * Market close scenario
 * - Higher volatility
 * - Fast updates
 * - Normal correlations
 */
export const MARKET_CLOSE: MarketSimulatorConfig = {
  updateFrequencyMs: 250,
  volatilityFactor: 0.6,
  correlationStrength: 0.7,
  scenario: MarketScenario.NORMAL,
  timeOfDay: TimeOfDay.MARKET_CLOSE,
  flashEventProbability: 0.008,
  flashEventMagnitude: 3.5,
};

/**
 * Quiet market scenario (lunchtime/after hours)
 * - Low volatility
 * - Slow updates
 * - Weaker correlations
 */
export const QUIET_MARKET: MarketSimulatorConfig = {
  updateFrequencyMs: 2000,
  volatilityFactor: 0.1,
  correlationStrength: 0.5,
  scenario: MarketScenario.NORMAL,
  timeOfDay: TimeOfDay.LUNCH,
  flashEventProbability: 0.0001,
  flashEventMagnitude: 1.5,
};

/**
 * Get a market configuration based on the current time of day
 * This can be used to automatically adjust the simulator based on time
 */
export function getTimeOfDayConfig(): MarketSimulatorConfig {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Simple time-based configuration (assuming trading hours 08:00-16:30)
  // Market open (08:00-09:30)
  if (hour === 8 || (hour === 9 && minute <= 30)) {
    return MARKET_OPEN;
  }

  // Morning session (09:30-12:00)
  if ((hour === 9 && minute > 30) || (hour >= 10 && hour < 12)) {
    return NORMAL_MARKET;
  }

  // Lunch hour (12:00-13:30)
  if (hour === 12 || (hour === 13 && minute <= 30)) {
    return QUIET_MARKET;
  }

  // Afternoon session (13:30-15:30)
  if ((hour === 13 && minute > 30) || (hour === 14) || (hour === 15 && minute <= 30)) {
    return NORMAL_MARKET;
  }

  // Market close (15:30-16:30)
  if ((hour === 15 && minute > 30) || (hour === 16 && minute <= 30)) {
    return MARKET_CLOSE;
  }

  // After hours (16:30-08:00)
  return {
    ...QUIET_MARKET,
    updateFrequencyMs: 5000, // Even slower updates after hours
    timeOfDay: TimeOfDay.AFTER_HOURS,
  };
}