// src/lib/us-grid-emissions/index.ts
import { EiaApi } from './apis/eia-api';
import { EmissionsCalculator } from './emissions/emissions-calculator';
import { USGridEmissionsParams } from './types';
import { PluginFactory } from '@grnsft/if-core/interfaces';
import {PluginParams, ConfigParams} from '@grnsft/if-core/types';

export const USGridEmissionsPlugin = PluginFactory({
    configValidation: (config: ConfigParams) => {
        // do config validation here or just pass zod schema

        return config;
    },
    inputValidation: (input: PluginParams) => {
        // do input validation here or pass zod schema

        return input;
    },
    implementation: async (inputs: PluginParams[], _config: ConfigParams) => {
        const eiaApi = new EiaApi();
        let outputs: USGridEmissionsParams[] = [];

        for await (const input of inputs) {
            const startDate = new Date(input['timestamp']);
            const endDate = new Date(startDate.getTime() + input['duration'] * 1000);
            const calc = new EmissionsCalculator(eiaApi, startDate, endDate);
            const emissions = await calc.addProductionEmissions();

            for (const [key, value] of Object.entries(emissions)) {
                outputs.push(
                    {
                        timestamp: `${key}`,
                        duration: 3600,
                        emissions: value,
                    }
                )
            }
        }

        return outputs;
    },
});
