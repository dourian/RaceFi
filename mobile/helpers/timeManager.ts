// Central time management for the app
// This allows us to simulate time progression for testing and demo purposes

import React from "react";

class TimeManager {
  private static instance: TimeManager;
  private currentTime: number = Date.now();
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  // Get the current app time (can be different from real time for simulation)
  public getCurrentTime(): number {
    return this.currentTime;
  }

  // Set the current app time (for simulation purposes)
  public setCurrentTime(timestamp: number): void {
    this.currentTime = timestamp;
    this.notifyListeners();
  }

  // Advance time by a specific amount (in milliseconds)
  public advanceTime(milliseconds: number): void {
    this.currentTime += milliseconds;
    this.notifyListeners();
  }

  // Advance time by days (convenience method)
  public advanceTimeByDays(days: number): void {
    this.advanceTime(days * 24 * 60 * 60 * 1000);
  }

  // Advance time by hours (convenience method)
  public advanceTimeByHours(hours: number): void {
    this.advanceTime(hours * 60 * 60 * 1000);
  }

  // Reset to real current time
  public resetToRealTime(): void {
    this.currentTime = Date.now();
    this.notifyListeners();
  }

  // Subscribe to time changes
  public addListener(listener: () => void): void {
    this.listeners.add(listener);
  }

  // Unsubscribe from time changes
  public removeListener(listener: () => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Utility methods for common time calculations
  public getDaysUntil(targetDate: Date): number {
    const timeDiff = targetDate.getTime() - this.currentTime;
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  public getHoursUntil(targetDate: Date): number {
    const timeDiff = targetDate.getTime() - this.currentTime;
    return Math.floor(timeDiff / (1000 * 60 * 60));
  }

  public getMinutesUntil(targetDate: Date): number {
    const timeDiff = targetDate.getTime() - this.currentTime;
    return Math.floor(timeDiff / (1000 * 60));
  }

  public isExpired(endDate: Date): boolean {
    return endDate.getTime() < this.currentTime;
  }
}

// Export singleton instance
export const timeManager = TimeManager.getInstance();

// Convenience function for components to get current app time
export const getCurrentAppTime = () => timeManager.getCurrentTime();

// Hook for React components to re-render when time changes
export const useAppTime = () => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    timeManager.addListener(forceUpdate);
    return () => timeManager.removeListener(forceUpdate);
  }, []);

  return timeManager.getCurrentTime();
};

// For development/testing - add time controls
export const TimeControls = {
  advanceDays: (days: number) => timeManager.advanceTimeByDays(days),
  advanceHours: (hours: number) => timeManager.advanceTimeByHours(hours),
  reset: () => timeManager.resetToRealTime(),
  getCurrentTime: () => timeManager.getCurrentTime(),
};
