// import pl, { DataFrame } from 'nodejs-polars';
import { HourlyFuelTypeGenerationData, HourlyInterchangeData } from "../types";
import { BALANCING_AUTHORITIES, CO2_EMISSIONS_FACTORS } from "../util/constants";
import { ERRORS } from '../util/errors';
const {UnrecognizedFuelTypeError} = ERRORS;

export class EmissionsCalculator {
    constructor(
        private readonly balancingAuthorities: string[] = BALANCING_AUTHORITIES,
        private readonly co2EmissionsFactors: Record<string, number> = CO2_EMISSIONS_FACTORS
    ) {}

    getGenerationMatrix(generationData: HourlyFuelTypeGenerationData[]): number[] {
        const generationMap = new Map<string, number>();
        generationData.forEach(data => {
            const balancingAuthority = `${data.respondent}`;
            generationMap.set(balancingAuthority, (generationMap.get(balancingAuthority) || 0) + parseFloat(data.value));
        });
        return this.balancingAuthorities.map(ba => generationMap.get(ba) || 0);
    }

    getEmissionsMatrix(generationData: HourlyFuelTypeGenerationData[]): number[] {
        const generationMap = new Map<string, number>();
        generationData.forEach(data => {
            const balancingAuthority = `${data.respondent}`;

            let fuelType = data.fueltype;
            // Rename "NG" to "GAS" to avoid confusion with net generation
            if (fuelType === 'NG') {
                fuelType = 'GAS';
            }
            
            if (!(fuelType in this.co2EmissionsFactors)) {
                throw new UnrecognizedFuelTypeError(`Unrecognized fuel type, cannot accurately calculate emissions: ${data.fueltype}. Please contact developers to add fuel type support.`)
            }

            const previousEmissions = generationMap.get(balancingAuthority) || 0;
            const emissionsForFuelType = parseFloat(data.value) * this.co2EmissionsFactors[fuelType];
            generationMap.set(balancingAuthority, previousEmissions + emissionsForFuelType);
        });
        return this.balancingAuthorities.map(ba => generationMap.get(ba) || 0);
    }

    getInterchangeMatrix(interchangeData: HourlyInterchangeData[]): number[][] {
        const interchangeMap = new Map<string, number>();
        for  (const data of interchangeData) {
            const key = `${data.fromba}-${data.toba}`;
            const value = parseFloat(data.value);
            interchangeMap.set(key, value);
        }
        
        const interchangeMatrix: number[][] = [];
        for (const fromBa of this.balancingAuthorities) {
            const row: number[] = [];
            for (const toBa of this.balancingAuthorities) {
                row.push(interchangeMap.get(`${fromBa}-${toBa}`) || 0);
            }
            interchangeMatrix.push(row);
        }

        return interchangeMatrix;
    }

    getCarbonIntensities(emissions: number[], interchange: number[][], generation: number[]): number[] {
        console.log(`Calculating emissions... ${emissions.length} ${interchange.length} ${generation.length}`);
        return [];
    }
}
