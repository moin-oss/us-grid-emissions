import {HourlyFuelTypeGeneration} from '../types';
import {CO2_EMISSIONS_FACTORS} from '../constants';

export const CarbonIntensityAPI = () => {
    const BASE_URL = "https://api.eia.gov/v2";
    const FUEL_TYPE_DATA_ROUTE = "electricity/rto/fuel-type-data/data";
    const API_KEY = ""; // TODO: API Key needs to come from env variable
    const MAX_ROWS = 5000; // Max number of rows we can request from the API in one call

    /**
     * Fetches hourly net generation for the given balancing authority by energy source.
     * Source: Form EIA-930 Product: Hourly Electric Grid Monitor.
     */
    const fetchFuelTypeData = async (balancingAuthority: string, startDate: string, endDate: string): Promise<HourlyFuelTypeGeneration[]> => {
        const searchParams = new URLSearchParams();
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
        searchParams.append("offset", String(0)); // TODO: This needs to change to reflect the true offset
        searchParams.append("api_key", API_KEY);

        try {
            const url = `${BASE_URL}/${FUEL_TYPE_DATA_ROUTE}?${searchParams.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.log(response.status);
                throw new Error(`API request failed with status ${response.status}`);
            }
            const responseJson= await response.json();

            if (responseJson.response && responseJson.response.errors) {
                throw responseJson.response.errors;
            }

            return responseJson.response.data;
        } catch (error) {
            console.error("Failed to fetch fuel type data:", error);
            throw error;
        }
    };

    const calculateEmissions = async (balancingAuthority: string, startDate: string, endDate: string): Promise<Record<string, number>> => {
        // {"period":"2024-10-24T15","respondent":"CAL","respondent-name":"California","fueltype":"COL","type-name":"Coal","value":"552","value-units":"megawatthours"}
        const fuelTypeData = await fetchFuelTypeData(balancingAuthority, startDate, endDate);

        // Grouping by period
        const groupedByPeriod = fuelTypeData.reduce((acc: Record<string, HourlyFuelTypeGeneration[]>, current: HourlyFuelTypeGeneration) => {
            // If the period doesn't exist in the accumulator, initialize it with an empty array
            if (!acc[current.period]) {
                acc[current.period] = [];
            }
            // Push the current item into the array for the period
            acc[current.period].push(current);
            return acc;
        }, {});

        // Calculating emissions for each period
        const emissionsByPeriod = Object.keys(groupedByPeriod).reduce((acc: Record<string, number>, period: string) => {
            const periodData = groupedByPeriod[period];
            acc[period] = periodData.reduce((sum: number, data: HourlyFuelTypeGeneration) => {
                const emissionsFactor = CO2_EMISSIONS_FACTORS[data.fueltype] || 0; // Default to 0 if type is not found //TODO: This isn't great, we should emit the fuel types that we can't account for
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
