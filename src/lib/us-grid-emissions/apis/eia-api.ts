import {HourlyFuelTypeGeneration} from '../types';
import {CO2_EMISSIONS_FACTORS} from '../constants';
import {ERRORS} from '../util/errors';

const {APIRequestError} = ERRORS;

export const CarbonIntensityAPI = () => {
    const BASE_URL = "https://api.eia.gov/v2";
    const FUEL_TYPE_DATA_ROUTE = "electricity/rto/fuel-type-data/data";
    const MAX_ROWS = 5000; // Max number of rows we can request from the API in one call

    /**
     * Fetches hourly net generation for the given balancing authority by energy source.
     * Source: Form EIA-930 Product: Hourly Electric Grid Monitor.
     */
    const fetchFuelTypeData = async (balancingAuthority: string, startDate: string, endDate: string): Promise<HourlyFuelTypeGeneration[]> => {
        const searchParams = new URLSearchParams();
        const apiKey = process.env.EIA_API_KEY;

        if (!apiKey) {
            throw new APIRequestError('Cannot call EIA API without EIA_API_KEY environment variable.');
        }

        searchParams.append("start", startDate);
        searchParams.append("end", endDate);
        searchParams.append("frequency", "hourly");
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "respondent");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("facets[respondent][]", balancingAuthority);
        searchParams.append("length", String(MAX_ROWS));
        searchParams.append("offset", String(0)); // TODO: If we need to return more than 5000 rows, we will lose data currently since we don't modify the offset
        searchParams.append("api_key", apiKey);

        try {
            const url = `${BASE_URL}/${FUEL_TYPE_DATA_ROUTE}?${searchParams.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const responseJson= await response.json();

            if (responseJson.response && responseJson.response.errors) {
                throw new Error(responseJson.response.errors);
            }

            console.log(`LENGTH: ${responseJson.response.data.length}`);

            return responseJson.response.data;
        } catch (error) {
            throw new APIRequestError('Failed to fetch fuel type data: ${error}');
        }
    };

    const calculateEmissions = async (balancingAuthority: string, startDate: string, endDate: string): Promise<Record<string, number>> => {
        const fuelTypeData = await fetchFuelTypeData(balancingAuthority, startDate, endDate);

        // Group hourly generation per fuel type by period
        const groupedByPeriod = fuelTypeData.reduce((acc: Record<string, HourlyFuelTypeGeneration[]>, current: HourlyFuelTypeGeneration) => {
            if (!acc[current.period]) {
                acc[current.period] = [];
            }
            acc[current.period].push(current);
            return acc;
        }, {});

        // Calculate emissions for each period
        const emissionsByPeriod = Object.keys(groupedByPeriod).reduce((acc: Record<string, number>, period: string) => {
            const periodData = groupedByPeriod[period];
            acc[period] = periodData.reduce((sum: number, data: HourlyFuelTypeGeneration) => {
                const emissionsFactor = CO2_EMISSIONS_FACTORS[data.fueltype] || 0; // TODO: What should we do if we don't have a fuel type? Currently the factor is set to 0, which isn't right
                const value = parseFloat(data.value);
                return sum + (value * emissionsFactor);
            }, 0);
            return acc;
        }, {});

        return emissionsByPeriod;

    }

    return {
        calculateEmissions,
    };
};
