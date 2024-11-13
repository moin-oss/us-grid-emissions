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
        // For the time being, assume that we are always fetching exactly 1 day of data. Work to handle more
        //  flexible time ranges will be done later
        const startDate = new Date(inputs[0]['timestamp']);
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        
        // Fetch 24h of EIA data
        const eiaApi = new EiaApi();
        const interchangeData = await eiaApi.fetchInterchangeData(startDate, endDate);
        const regionData = await eiaApi.fetchRegionData(startDate, endDate);
        const fuelTypeData = await eiaApi.fetchFuelTypeData(startDate, endDate);

        // TODO remove these eventually
        console.log(`Fetched ${interchangeData.length} rows of interchange data`);
        console.log(`Fetched ${regionData.length} rows of region data`);
        console.log(`Fetched ${fuelTypeData.length} rows of fuel type data`);
        
        // For each hour, calculate emissions
        const calc = new EmissionsCalculator(eiaApi, startDate, endDate);
        const hours: Date[] = [];
        for (let i = 0; i < 1; i++) {
            const date = new Date(startDate.getTime() + i * 60 * 60 * 1000);
            hours.push(date);
        }

        let outputs: USGridEmissionsParams[] = [];
        for (const hour of hours) {
            const eiaPeriod = eiaApi.formatTimestamp(hour);
            console.log(`Calculating emissions for hour: ${eiaPeriod}`);
            // To calculate emissions:
            // 1. Make emissions matrix (F)
            // This is how much emissions is generated by each BA

            // 2. Make exchange emissions matrix (ID)
            // This is how much electricity is exchanged between BAs
            const interchangeForHour = interchangeData.filter(data => data.period === eiaPeriod);
            const interchange = calc.getInterchangeMatrix(interchangeForHour);
            
            // 3. Make generation matrix (P)
            // This is how much electicity is generated by each BA

            // 4. Do linear algebra to get M
            // This the the demand emissions intensity for each BA
            calc.calculateEmissions([], interchange, []);
        }
        
        // Use pola.rs library to construct dataframes for the matricies
        // Use math.js to solve the linear systems
        
        
        // for await (const input of inputs) {
        //     const startDate = new Date(input['timestamp']);
        //     const endDate = new Date(startDate.getTime() + input['duration'] * 1000);
        //     const emissions = await calc.addProductionEmissions();

        //     for (const [key, value] of Object.entries(emissions)) {
        //         outputs.push(
        //             {
        //                 timestamp: `${key}`,
        //                 duration: 3600,
        //                 emissions: value,
        //             }
        //         )
        //     }
        // }

        return outputs;
    },
});
