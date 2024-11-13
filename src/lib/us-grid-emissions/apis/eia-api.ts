import {HourlyFuelTypeGenerationData, HourlyInterchangeData, HourlyRegionData} from '../types';
import {CO2_EMISSIONS_FACTORS} from '../util/constants';
import {ERRORS} from '../util/errors';
import * as moment from 'moment';

const {APIRequestError, UnrecognizedFuelTypeError} = ERRORS;

const getEIAApiKey = (): string => {
    const apiKey = process.env.EIA_API_KEY;
    if (!apiKey) {
        throw new APIRequestError('EIA_API_KEY environment variable is not set.');
    }
    return apiKey;
};

export const CarbonIntensityAPI = () => {
    const BASE_URL = "https://api.eia.gov/v2";
    const FUEL_TYPE_DATA_ROUTE = "electricity/rto/fuel-type-data/data";
    const INTERCHANGE_DATA_ROUTE = "electricity/rto/interchange-data/data";
    const REGION_DATA_ROUTE = "electricity/rto/region-data/data";
    const MAX_ROWS = 5000; // Max number of rows we can request from the API in one call
    const API_KEY = getEIAApiKey();

    const formatTimestamp = (d: Date): string => {
        return moment(d).format('YYYY-MM-DDTHH');
    };

    const fetchData = async (route: string, searchParams: URLSearchParams): Promise<any[]> => {
        const MAX_ROWS = 5000; // Max number of rows we can request from the API in one call
        let offset = 0;
        let hasMoreData = true;
        let allData: any[] = [];

        while (hasMoreData) {
            searchParams.set("offset", String(offset));

            try {
                const url = `${BASE_URL}/${route}?${searchParams.toString()}`;
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Status ${response.status}`);
                }

                const responseJson = await response.json();
                if (responseJson.response && responseJson.response.errors) {
                    throw new Error(`Response errors: ${responseJson.response.errors.join('; ')}`);
                }

                allData = allData.concat(responseJson.response.data);
                hasMoreData = responseJson.response.data.length === MAX_ROWS;
                offset += MAX_ROWS;
            } catch (error) {
                throw new APIRequestError(`EIA API request failed: ${error}`);
            }
        }

        return allData;
    };

    const fetchRegionData = async (balancingAuthority: string, startDate: Date, endDate: Date): Promise<HourlyRegionData[]> => {
        const searchParams = new URLSearchParams();

        searchParams.append("start", formatTimestamp(startDate));
        searchParams.append("end", formatTimestamp(endDate));
        searchParams.append("frequency", "hourly");  // Expect UTC timestamps as 'YYYY-MM-DDTHH'
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "respondent");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("sort[2][column]", "type");
        searchParams.append("sort[2][direction]", "asc");
        searchParams.append("facets[respondent][]", balancingAuthority);
        searchParams.append("length", String(MAX_ROWS));
        searchParams.append("api_key", API_KEY);
        searchParams.append("facets[type][0]", "D");
        searchParams.append("facets[type][1]", "NG");
        searchParams.append("facets[type][2]", "TI");

        return await fetchData(REGION_DATA_ROUTE, searchParams);
    }

    const fetchInterchangeData = async (balancingAuthority: string, startDate: Date, endDate: Date): Promise<HourlyInterchangeData[]> => {
        const fromBaSearchParams = createInterchangeSearchParams(true, balancingAuthority, startDate, endDate);
        const fromBaData: HourlyInterchangeData[] = await fetchData(INTERCHANGE_DATA_ROUTE, fromBaSearchParams);

        const toBaSearchParams = createInterchangeSearchParams(false, balancingAuthority, startDate, endDate);
        const toBaData: HourlyInterchangeData[] = await fetchData(INTERCHANGE_DATA_ROUTE, toBaSearchParams);

        return [...fromBaData, ...toBaData];
    };

    const createInterchangeSearchParams = (isFromBa: boolean, balancingAuthority: string, startDate: Date, endDate: Date): URLSearchParams => {
        const searchParams = new URLSearchParams();
        searchParams.append("start", formatTimestamp(startDate));
        searchParams.append("end", formatTimestamp(endDate));
        searchParams.append("frequency", "hourly");  // Expect UTC timestamps as 'YYYY-MM-DDTHH'
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "fromba");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("sort[2][column]", "toba");
        searchParams.append("sort[2][direction]", "asc");
        searchParams.append("length", String(MAX_ROWS));
        searchParams.append("api_key", API_KEY);

        if (isFromBa) {
            searchParams.append("facets[fromba][]", balancingAuthority);
        } else {
            searchParams.append("facets[toba][]", balancingAuthority);
        }

        return searchParams;
    }

    /**
     * Fetches hourly net generation for the given balancing authority by energy source.
     * Source: Form EIA-930 Product: Hourly Electric Grid Monitor.
     */
    const fetchFuelTypeData = async (balancingAuthority: string, startDate: Date, endDate: Date): Promise<HourlyFuelTypeGenerationData[]> => {
        const searchParams = new URLSearchParams();

        searchParams.append("start", formatTimestamp(startDate));
        searchParams.append("end", formatTimestamp(endDate));
        searchParams.append("frequency", "hourly");  // Expect UTC timestamps as 'YYYY-MM-DDTHH'
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "respondent");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("facets[respondent][]", balancingAuthority);
        searchParams.append("length", String(MAX_ROWS));
        searchParams.append("api_key", API_KEY);

        return await fetchData(FUEL_TYPE_DATA_ROUTE, searchParams);
    };

    const calculateEmissions = async (balancingAuthority: string, startDate: Date, endDate: Date): Promise<Record<string, number>> => {
        const fuelTypeData = await fetchFuelTypeData(balancingAuthority, startDate, endDate);

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

    return {
        calculateEmissions,
        fetchFuelTypeData,
        fetchInterchangeData,
        fetchRegionData
    };
};
