export type YourGlobalConfig = Record<string, any>;

export type USGridEmissionsParams = Record<string, any>;

export type USGridEmissionsInterface = {
    execute: (
        inputs: USGridEmissionsParams[],
        config?: Record<string, any>
    ) => Promise<USGridEmissionsParams[]>;
    metadata: {
        kind: string;
    };
    [key: string]: any;
};

export type HourlyFuelTypeGeneration = {
  period: string;
  respondent: string;
  "respondent-name": string;
  fueltype: string;
  "type-name": string;
  value: string;
  "value-units": string;
};
