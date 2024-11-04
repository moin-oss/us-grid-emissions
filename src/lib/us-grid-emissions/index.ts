// src/lib/us-grid-emissions/index.ts
import { CarbonIntensityAPI } from './apis/eia-api';
import { USGridEmissionsParams } from './types';
import { PluginFactory } from '@grnsft/if-core/interfaces';
import {PluginParams, ConfigParams} from '@grnsft/if-core/types';

const calculateEmissions = async (balancingAuthority: string, startDate: string, endDate: string) => {
    const eiaApi = CarbonIntensityAPI();
    return eiaApi.calculateEmissions(balancingAuthority, startDate, endDate);
};

export const USGridEmissionsPlugin = PluginFactory({
    configValidation: (config: ConfigParams) => {
        // do config validation here or just pass zod schema

        return config;
    },
    inputValidation: (input: PluginParams) => {
        // do input validation here or pass zod schema

        return input;
    },
    implementation: async (inputs: PluginParams[], config: ConfigParams) => {
        const inputAndConfig = Object.assign({}, inputs, config);
        inputAndConfig;

        let outputs: USGridEmissionsParams[] = [];

        for await (const input of inputs) {
            const startDate: string = input['start-date'];
            const endDate: string = input['end-date'];
            const balancingAuthority: string = input['balancing-authority'];
            const emissions = await calculateEmissions(balancingAuthority, startDate, endDate);

            for (const [key, value] of Object.entries(emissions)) {
                outputs.push(
                    {
                        'balancing-authority': balancingAuthority,
                        timestamp: key,
                        emissions: value,
                    }
                )
            }
        }

        return outputs;
    },
});
