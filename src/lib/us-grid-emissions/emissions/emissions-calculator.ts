// import pl, { DataFrame } from 'nodejs-polars';
import { EiaApi } from "../apis/eia-api";
import { HourlyFuelTypeGenerationData, HourlyInterchangeData } from "../types";
import { BALANCING_AUTHORITIES, CO2_EMISSIONS_FACTORS } from "../util/constants";
import {ERRORS} from '../util/errors';
const {UnrecognizedFuelTypeError} = ERRORS;


export class EmissionsCalculator {
    constructor(
        private readonly eiaApi: EiaApi,
        private readonly startDate: Date,
        private readonly endDate: Date
    ) {}
    
    async addProductionEmissions(): Promise<Record<string, number>> {
        const fuelTypeData = await this.eiaApi.fetchFuelTypeData(this.startDate, this.endDate);
        
        // Group hourly generation per fuel type by period
        const groupedByPeriod = fuelTypeData.reduce((acc: Record<string, HourlyFuelTypeGenerationData[]>, current: HourlyFuelTypeGenerationData) => {
            if (!acc[current.period]) {
                acc[current.period] = [];
            }
            acc[current.period].push(current);
            return acc;
        }, {});
        
        // Calculate emissions for each period
        const emissionsByPeriod = Object.keys(groupedByPeriod).reduce((acc: Record<string, number>, period: string) => {
            const periodData = groupedByPeriod[period];
            const isoTimestampForPeriod = `${period}:00Z`
            acc[isoTimestampForPeriod] = periodData.reduce((sum: number, data: HourlyFuelTypeGenerationData) => {
                let fuelType = data.fueltype;
                // Rename "NG" to "GAS" to avoid confusion with net generation
                if (fuelType === 'NG') {
                    fuelType = 'GAS';
                }
                
                if (!(fuelType in CO2_EMISSIONS_FACTORS)) {
                    throw new UnrecognizedFuelTypeError(`Unrecognized fuel type, cannot accurately calculate emissions: ${data.fueltype}. Please contact developers to add fuel type support.`)
                }
                const emissionsFactor = CO2_EMISSIONS_FACTORS[data.fueltype] | 0;
                const value = parseFloat(data.value);
                return sum + (value * emissionsFactor);
            }, 0);
            return acc;
        }, {});
        
        return emissionsByPeriod;
    }

    getEmissionsMatrix(_: any[]): number[] {
        return [];
    }

    getInterchangeMatrix(interchangeData: HourlyInterchangeData[]): number[][] {
        const interchangeMap = new Map<string, number>();
        for  (const data of interchangeData) {
            const key = `${data.fromba}-${data.toba}`;
            const value = parseFloat(data.value);
            interchangeMap.set(key, value);
        }
        
        const interchangeMatrix: number[][] = [];
        for (const fromBa of BALANCING_AUTHORITIES) {
            const row: number[] = [];
            for (const toBa of BALANCING_AUTHORITIES) {
                row.push(interchangeMap.get(`${fromBa}-${toBa}`) || 0);
            }
            interchangeMatrix.push(row);
        }

        return interchangeMatrix;
    }

    getGenerationMatrix(_: any[]): number[] {
        return [];
    }

    calculateEmissions(emissions: number[], interchange: number[][], generation: number[]): number[] {
        console.log(`Calculating emissions... ${emissions.length} ${interchange.length} ${generation.length}`);
        return [];
    }
}
