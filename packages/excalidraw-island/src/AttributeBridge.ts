/**
 * AttributeBridge - Flexible and extensible attribute-to-props system
 * 
 * Features:
 * - Type-safe parsing with error handling
 * - Debounced updates for performance
 * - Extensible parser and validator system
 * - Immutable props pattern
 * - Future-proof configuration-driven architecture
 */

import type { 
  IslandProps, 
  IslandScene, 
  AttributeConfig, 
  UpdatePolicy 
} from './types';

/**
 * Parser function type for converting string attributes to typed values
 */
export type AttributeParser<T = any> = (value: string | null) => T;

/**
 * Validator function type for validating parsed values
 */
export type AttributeValidator<T = any> = (value: T) => boolean;

/**
 * Update callback function type
 */
export type PropsUpdateCallback = (props: IslandProps) => void;

/**
 * Built-in attribute parsers with comprehensive error handling
 */
export const AttributeParsers = {
  /**
   * Parse number attributes with validation
   */
  number: (min?: number, max?: number): AttributeParser<number> => 
    (value: string | null): number => {
      if (!value || value.trim() === '') return NaN;
      
      const parsed = parseFloat(value.trim());
      if (isNaN(parsed)) return NaN;
      
      if (min !== undefined && parsed < min) return NaN;
      if (max !== undefined && parsed > max) return NaN;
      
      return parsed;
    },

  /**
   * Parse boolean attributes (presence-based or string-based)
   */
  boolean: (): AttributeParser<boolean> =>
    (value: string | null): boolean => {
      if (value === null) return false;
      if (value === '') return true; // Presence-based (e.g., <element readonly>)
      
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
    },

  /**
   * Parse JSON attributes with schema validation
   */
  json: <T = any>(schema?: (obj: any) => obj is T): AttributeParser<T | null> =>
    (value: string | null): T | null => {
      if (!value || value.trim() === '') return null;
      
      try {
        const parsed = JSON.parse(value.trim());
        
        // Apply schema validation if provided
        if (schema && !schema(parsed)) {
          console.warn('[AttributeBridge] JSON value failed schema validation:', parsed);
          return null;
        }
        
        return parsed;
      } catch (error) {
        console.warn('[AttributeBridge] Invalid JSON attribute:', value, error);
        return null;
      }
    },

  /**
   * Parse string attributes with trimming and optional constraints
   */
  string: (allowEmpty: boolean = true, maxLength?: number): AttributeParser<string> =>
    (value: string | null): string => {
      if (!value) return '';
      
      const trimmed = value.trim();
      if (!allowEmpty && trimmed === '') return '';
      if (maxLength && trimmed.length > maxLength) return trimmed.substring(0, maxLength);
      
      return trimmed;
    },

  /**
   * Parse enum attributes with type safety
   */
  enum: <T extends string>(...validValues: T[]): AttributeParser<T | null> =>
    (value: string | null): T | null => {
      if (!value) return null;
      
      const trimmed = value.trim() as T;
      return validValues.includes(trimmed) ? trimmed : null;
    }
};

/**
 * Built-in validators for common validation patterns
 */
export const AttributeValidators = {
  /**
   * Validate number ranges
   */
  numberRange: (min: number, max: number): AttributeValidator<number> =>
    (value: number): boolean => !isNaN(value) && value >= min && value <= max,

  /**
   * Validate positive numbers
   */
  positive: (): AttributeValidator<number> =>
    (value: number): boolean => !isNaN(value) && value > 0,

  /**
   * Validate non-negative numbers
   */
  nonNegative: (): AttributeValidator<number> =>
    (value: number): boolean => !isNaN(value) && value >= 0,

  /**
   * Validate object structure
   */
  hasProperties: (requiredProps: string[]): AttributeValidator<object> =>
    (value: object): boolean => {
      if (!value || typeof value !== 'object') return false;
      return requiredProps.every(prop => prop in value);
    }
};

/**
 * Scene validator function to ensure IslandScene structure
 */
const isValidScene = (obj: any): obj is IslandScene => {
  return obj && 
         typeof obj === 'object' && 
         Array.isArray(obj.elements) && 
         obj.appState && 
         typeof obj.appState === 'object';
};

/**
 * Comprehensive attribute configuration for Excalidraw Island
 * This configuration makes the system extensible and maintainable
 */
export const ATTRIBUTE_CONFIG: Record<string, AttributeConfig> = {
  scale: {
    attribute: 'scale',
    prop: 'scale',
    parser: AttributeParsers.number(0.1, 10), // Scale between 10% and 1000%
    defaultValue: 1.0,
    validator: AttributeValidators.numberRange(0.1, 10)
  },
  
  readonly: {
    attribute: 'readonly', 
    prop: 'readonly',
    parser: AttributeParsers.boolean(),
    defaultValue: false
  },
  
  'initial-scene': {
    attribute: 'initial-scene',
    prop: 'initialScene',
    parser: AttributeParsers.json(isValidScene),
    defaultValue: null,
    validator: (value) => value === null || isValidScene(value)
  }
} as const;

/**
 * Default update policy optimized for performance and UX
 */
export const DEFAULT_UPDATE_POLICY: UpdatePolicy = {
  debounceMs: 16, // ~60fps for smooth visual updates
  batchUpdates: true,
  deepCompare: true
};

/**
 * AttributeBridge class - manages attribute parsing and prop updates
 */
export class AttributeBridge {
  private props: IslandProps;
  private updateCallback: PropsUpdateCallback | null = null;
  private updateTimer: number | null = null;
  private pendingAttributes = new Set<string>();
  
  constructor(
    private config: Record<string, AttributeConfig> = ATTRIBUTE_CONFIG,
    private updatePolicy: UpdatePolicy = DEFAULT_UPDATE_POLICY
  ) {
    // Initialize props with default values
    this.props = this.getDefaultProps();
  }

  /**
   * Set the callback function for prop updates
   */
  setUpdateCallback(callback: PropsUpdateCallback): void {
    this.updateCallback = callback;
  }

  /**
   * Get current props (immutable)
   */
  getProps(): Readonly<IslandProps> {
    return Object.freeze({ ...this.props });
  }

  /**
   * Process attribute change and trigger debounced update
   */
  processAttributeChange(attributeName: string, element: HTMLElement): void {
    if (!this.config[attributeName]) {
      console.warn(`[AttributeBridge] Unknown attribute: ${attributeName}`);
      return;
    }

    this.pendingAttributes.add(attributeName);
    
    if (this.updatePolicy.batchUpdates) {
      this.scheduleDebouncedUpdate(element);
    } else {
      this.updateSingleAttribute(attributeName, element);
    }
  }

  /**
   * Process multiple attributes synchronously (for initialization)
   */
  processAllAttributes(element: HTMLElement): void {
    let hasChanges = false;
    const newProps = { ...this.props };

    for (const [key, config] of Object.entries(this.config)) {
      const newValue = this.parseAttribute(config, element);
      if (!this.deepEqual(newProps[config.prop], newValue)) {
        newProps[config.prop] = newValue;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.props = newProps;
      this.notifyUpdate();
    }
  }

  /**
   * Add or update attribute configuration dynamically
   */
  registerAttribute(config: AttributeConfig): void {
    this.config[config.attribute] = config;
  }

  /**
   * Remove attribute configuration
   */
  unregisterAttribute(attributeName: string): void {
    delete this.config[attributeName];
  }

  /**
   * Get default props based on configuration
   */
  private getDefaultProps(): IslandProps {
    const props = {} as IslandProps;
    
    for (const config of Object.values(this.config)) {
      props[config.prop] = config.defaultValue;
    }
    
    return props;
  }

  /**
   * Parse single attribute using its configuration
   */
  private parseAttribute(config: AttributeConfig, element: HTMLElement): any {
    const rawValue = element.getAttribute(config.attribute);
    const parsedValue = config.parser(rawValue);
    
    // Validate parsed value
    if (config.validator && !config.validator(parsedValue)) {
      console.warn(`[AttributeBridge] Validation failed for ${config.attribute}:`, parsedValue);
      return config.defaultValue;
    }
    
    // Use default if parsing failed (e.g., returned NaN)
    if (parsedValue !== parsedValue) { // NaN check
      return config.defaultValue;
    }
    
    return parsedValue !== undefined ? parsedValue : config.defaultValue;
  }

  /**
   * Update single attribute immediately
   */
  private updateSingleAttribute(attributeName: string, element: HTMLElement): void {
    const config = this.config[attributeName];
    const newValue = this.parseAttribute(config, element);
    
    if (!this.deepEqual(this.props[config.prop], newValue)) {
      this.props = { ...this.props, [config.prop]: newValue };
      this.notifyUpdate();
    }
  }

  /**
   * Schedule debounced update for batched changes
   */
  private scheduleDebouncedUpdate(element: HTMLElement): void {
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = window.setTimeout(() => {
      this.processPendingUpdates(element);
      this.updateTimer = null;
    }, this.updatePolicy.debounceMs);
  }

  /**
   * Process all pending attribute updates
   */
  private processPendingUpdates(element: HTMLElement): void {
    let hasChanges = false;
    const newProps = { ...this.props };

    for (const attributeName of this.pendingAttributes) {
      const config = this.config[attributeName];
      if (!config) continue;

      const newValue = this.parseAttribute(config, element);
      if (!this.deepEqual(newProps[config.prop], newValue)) {
        newProps[config.prop] = newValue;
        hasChanges = true;
      }
    }

    this.pendingAttributes.clear();

    if (hasChanges) {
      this.props = newProps;
      this.notifyUpdate();
    }
  }

  /**
   * Notify update callback with current props
   */
  private notifyUpdate(): void {
    if (this.updateCallback) {
      this.updateCallback(this.getProps());
    }
  }

  /**
   * Deep equality check for complex objects
   */
  private deepEqual(a: any, b: any): boolean {
    if (!this.updatePolicy.deepCompare) {
      return a === b;
    }

    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Clean up timers and resources
   */
  destroy(): void {
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.pendingAttributes.clear();
    this.updateCallback = null;
  }
}

/**
 * Create a pre-configured AttributeBridge instance
 */
export function createAttributeBridge(
  customConfig?: Partial<Record<string, AttributeConfig>>,
  customPolicy?: Partial<UpdatePolicy>
): AttributeBridge {
  const config = customConfig ? { ...ATTRIBUTE_CONFIG, ...customConfig } : ATTRIBUTE_CONFIG;
  const policy = customPolicy ? { ...DEFAULT_UPDATE_POLICY, ...customPolicy } : DEFAULT_UPDATE_POLICY;
  
  return new AttributeBridge(config, policy);
}