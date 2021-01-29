import { enumFromValue } from './mod.ts';

/**
 * Represents a duration of time. Supports milliseconds through weeks.
 */
export class Duration {
    constructor(public readonly quantity: number, public readonly period: DurationPeriod) {}

    /**
     * Parse a duration from a string.
     * @param duration The string to parse
     */
    static parse(duration: string): Duration | undefined {
        const matches = duration.trim().match(/^(\d+)([a-z]{1,2})$/);
        if (!matches || matches.length === 0) {
            return undefined;
        }
        
        const period = enumFromValue(matches[2], DurationPeriod);
        if (!period) {
            return undefined;
        }

        const quantity = parseInt(matches[1]);
        if (isNaN(quantity)) {
            return undefined;
        }

        return new Duration(quantity, period);
    }

    /** The actual amount of time this duration represents in milliseconds. */
    get time(): number {
        return this.enumToTime(this.period) * this.quantity;
    }

    /**
     * Transforms a period type to milliseconds for further calculations.
     * @param period The period type to calculate the time in milliseconds for
     */
    private enumToTime(period: DurationPeriod): number {
        switch (period) {
            case DurationPeriod.MILLISECOND: return 1;
            case DurationPeriod.SECOND: return 1000;
            case DurationPeriod.MINUTE: return 1000*60;
            case DurationPeriod.HOUR: return 1000*60*60;
            case DurationPeriod.DAY: return 1000*60*60*24;
            case DurationPeriod.WEEK: return 1000*60*60*24*7;
            default: return 0;
        }
    }
}

/** 
 * Represents a base period of time. Used in durations.
 */
export enum DurationPeriod {
    MILLISECOND = 'ms',
    SECOND = 's',
    MINUTE = 'm',
    HOUR = 'h',
    DAY = 'd',
    WEEK = 'w'
}
