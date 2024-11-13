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

export type HourlyFuelTypeGenerationData = {
  period: string;
  respondent: string;
  "respondent-name": string;
  fueltype: string;
  "type-name": string;
  value: string;
  "value-units": string;
};

export type HourlyInterchangeData = {
    period: string;
    fromba: string;
    "fromba-name": string;
    toba: string;
    "toba-name": string;
    value: string;
    "value-units": string;
};

export type HourlyRegionData = {
    period: string;
    respondent: string;
    "respondent-name": string;
    type: string;
    "type-name": string;
    value: string;
    "value-units": string;
};
