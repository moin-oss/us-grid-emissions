
import { EmissionsCalculator } from './emissions-calculator';
import { HourlyFuelTypeGenerationData, HourlyInterchangeData } from '../types';
import {ERRORS} from '../util/errors';
const { UnrecognizedFuelTypeError } = ERRORS;

describe('EmissionsCalculator.getGenerationMatrix', () => {
    const mockBalancingAuthorities = ['BA1', 'BA2', 'BA3'];
    const emptyDataPoint: HourlyFuelTypeGenerationData = {
        period: '2023-01-01T00',
        respondent: '',
        'respondent-name': '',
        fueltype: '',
        'type-name': '',
        value: '0',
        'value-units': '',
    };

    const calculator = new EmissionsCalculator(mockBalancingAuthorities);

    it('should correctly aggregate generation data for each balancing authority', () => {
        const testData: HourlyFuelTypeGenerationData[] = [
            { ...emptyDataPoint, respondent: 'BA1', value: '100', fueltype: 'COAL' },
            { ...emptyDataPoint, respondent: 'BA1', value: '200', fueltype: 'GAS' },
            { ...emptyDataPoint, respondent: 'BA2', value: '300', fueltype: 'SOLAR' },
        ];

        const result = calculator.getGenerationMatrix(testData);
        
        expect(result).toEqual([300, 300, 0]);
    });

    it('should handle decimal values correctly', () => {
        const testData: HourlyFuelTypeGenerationData[] = [
            { ...emptyDataPoint, respondent: 'BA1', value: '100.5', fueltype: 'COAL' },
            { ...emptyDataPoint, respondent: 'BA1', value: '200.1', fueltype: 'GAS' },
            { ...emptyDataPoint, respondent: 'BA2', value: '300.7', fueltype: 'SOLAR' },
        ];

        const result = calculator.getGenerationMatrix(testData);
        
        expect(result).toEqual([300.6, 300.7, 0]);
    });

    it('should handle empty input array', () => {
        const result = calculator.getGenerationMatrix([]);
        
        expect(result).toEqual([0, 0, 0]);
    });
});

describe('EmissionsCalculator.getEmissionsMatrix', () => {
    const mockBalancingAuthorities = ['BA1', 'BA2', 'BA3'];
    const mockEmissionsFactors = {
        EF_1: 0.5,
        EF_2: 2,
        EF_3: 10,
        GAS: 30,
    };
    const emptyDataPoint: HourlyFuelTypeGenerationData = {
        period: '2023-01-01T00',
        respondent: '',
        'respondent-name': '',
        fueltype: '',
        'type-name': '',
        value: '0',
        'value-units': '',
    };
    
    const calculator = new EmissionsCalculator(mockBalancingAuthorities, mockEmissionsFactors);

    it('should correctly calculate emissions using CO2 factors', () => {
        const testData: HourlyFuelTypeGenerationData[] = [
            { ...emptyDataPoint, respondent: 'BA1', value: '100.6', fueltype: 'EF_1' },
            { ...emptyDataPoint, respondent: 'BA2', value: '200', fueltype: 'EF_2' },
            { ...emptyDataPoint, respondent: 'BA3', value: '300.5', fueltype: 'EF_3' },
        ];

        const result = calculator.getEmissionsMatrix(testData);
        expect(result).toEqual([50.3, 400, 3005]);
    });

    it('should aggregate emissions for multiple entries in same balancing authority', () => {
        const testData: HourlyFuelTypeGenerationData[] = [
            { ...emptyDataPoint, respondent: 'BA2', value: '100', fueltype: 'EF_1' },
            { ...emptyDataPoint, respondent: 'BA2', value: '100', fueltype: 'EF_2' },
            { ...emptyDataPoint, respondent: 'BA2', value: '100', fueltype: 'EF_3' },
        ];

        const result = calculator.getEmissionsMatrix(testData);
        expect(result).toEqual([0, 1250, 0]);
    });

    it('should handle NG fuel type by converting it to GAS', () => {
        const testData: HourlyFuelTypeGenerationData[] = [
            { ...emptyDataPoint, respondent: 'BA3', value: '100', fueltype: 'NG' },
            { ...emptyDataPoint, respondent: 'BA3', value: '100', fueltype: 'GAS' },
        ];

        const result = calculator.getEmissionsMatrix(testData);
        expect(result).toEqual([0, 0, 6000]);
    });

    it('should throw UnrecognizedFuelTypeError for invalid fuel types', () => {
        const testData: HourlyFuelTypeGenerationData[] = [
            { ...emptyDataPoint, respondent: 'BA1', value: '100', fueltype: 'INVALID_FUEL' },
        ];

        expect(() => calculator.getEmissionsMatrix(testData)).toThrow(UnrecognizedFuelTypeError);
    });


});

describe('EmissionsCalculator.getInterchangeMatrix', () => {
    const mockBalancingAuthorities = ['BA1', 'BA2', 'BA3'];
    const emptyDataPoint: HourlyInterchangeData = {
        period: '2023-01-01T00',
        fromba: '',
        'fromba-name': '',
        toba: '',
        'toba-name': '',
        value: '0',
        'value-units': '',
    };

    const calculator = new EmissionsCalculator(mockBalancingAuthorities);

    it('should create correct interchange matrix for multiple transfers', () => {
        const testData = [
            { ...emptyDataPoint, fromba: 'BA1', toba: 'BA2', value: '100.5' },
            { ...emptyDataPoint, fromba: 'BA1', toba: 'BA3', value: '200.1' },
            { ...emptyDataPoint, fromba: 'BA2', toba: 'BA3', value: '300.7' },
            { ...emptyDataPoint, fromba: 'BA3', toba: 'BA1', value: '400.2' },
        ];

        const result = calculator.getInterchangeMatrix(testData);
        
        expect(result).toEqual([
            [0, 100.5, 200.1],
            [0, 0, 300.7],
            [400.2, 0, 0]
        ]);
    });

    it('should handle empty interchange data', () => {
        const result = calculator.getInterchangeMatrix([]);
        
        expect(result).toEqual([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]);
    });

    it('should use last seen transfer for multiple transfers on same edge', () => {
        const testData = [
            { ...emptyDataPoint, fromba: 'BA1', toba: 'BA2', value: '100' },
            { ...emptyDataPoint, fromba: 'BA1', toba: 'BA2', value: '200' },
        ];

        const result = calculator.getInterchangeMatrix(testData);
        
        expect(result).toEqual([
            [0, 200, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]);
    });
});
