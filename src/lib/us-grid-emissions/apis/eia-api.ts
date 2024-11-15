import {HourlyFuelTypeGenerationData, HourlyInterchangeData, HourlyRegionData} from '../types';
import {ERRORS} from '../util/errors';
import * as moment from 'moment';

const {APIRequestError} = ERRORS;

export class EiaApi {
    private readonly BASE_URL = "https://api.eia.gov/v2";
    private readonly FUEL_TYPE_DATA_ROUTE = "electricity/rto/fuel-type-data/data";
    private readonly INTERCHANGE_DATA_ROUTE = "electricity/rto/interchange-data/data";
    private readonly REGION_DATA_ROUTE = "electricity/rto/region-data/data";
    private readonly MAX_ROWS = 5000; // Max number of rows we can request from the API in one call
    private apiKey: string;

    constructor() {
        const apiKey = process.env.EIA_API_KEY;
        if (!apiKey) {
            throw new APIRequestError('EIA_API_KEY environment variable is not set.');
        }
        this.apiKey = apiKey;
    }

    /**
     * Fetch hourly demand, net generation, and interchange by balancing authority within a date range.
     * Source: Form EIA-930 Product: Hourly Electric Grid Monitor
     * @param startDate start date, inclusive
     * @param endDate end date, inclusive
     */
    async fetchRegionData(startDate: Date, endDate: Date): Promise<HourlyRegionData[]> {
        const searchParams = new URLSearchParams();

        searchParams.append("start", this.formatTimestamp(startDate));
        searchParams.append("end", this.formatTimestamp(endDate));
        searchParams.append("frequency", "hourly");  // Expect UTC timestamps as 'YYYY-MM-DDTHH'
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "respondent");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("sort[2][column]", "type");
        searchParams.append("sort[2][direction]", "asc");
        searchParams.append("length", String(this.MAX_ROWS));
        searchParams.append("api_key", this.apiKey);
        searchParams.append("facets[type][0]", "D");
        searchParams.append("facets[type][1]", "NG");
        searchParams.append("facets[type][2]", "TI");

        return await this.fetchData(this.REGION_DATA_ROUTE, searchParams);
    }

    /**
     * Fetches hourly net generation by BA and energy source.
     * Source: Form EIA-930 Product: Hourly Electric Grid Monitor.
     * @param startDate start date, inclusive
     * @param endDate end date, inclusive
     */
    async fetchGenerationData(startDate: Date, endDate: Date): Promise<HourlyFuelTypeGenerationData[]> {
        const searchParams = new URLSearchParams();

        searchParams.append("start", this.formatTimestamp(startDate));
        searchParams.append("end", this.formatTimestamp(endDate));
        searchParams.append("frequency", "hourly");  // Expect UTC timestamps as 'YYYY-MM-DDTHH'
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "respondent");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("length", String(this.MAX_ROWS));
        searchParams.append("api_key", this.apiKey);

        return await this.fetchData(this.FUEL_TYPE_DATA_ROUTE, searchParams);
    };

    /**
     * Get hourly interchange between neighboring balancing authorities.
     * Source: Form EIA-930 Product: Hourly Electric Grid Monitor
     * one filtered by toba and one filtered by fromba
     * @param startDate start date, inclusive
     * @param endDate end date, inclusive
     */
    async fetchInterchangeData(startDate: Date, endDate: Date): Promise<HourlyInterchangeData[]> {
        const searchParams = new URLSearchParams();

        searchParams.append("start", this.formatTimestamp(startDate));
        searchParams.append("end", this.formatTimestamp(endDate));
        searchParams.append("frequency", "hourly");  // Expect UTC timestamps as 'YYYY-MM-DDTHH'
        searchParams.append("data[0]", "value");
        searchParams.append("sort[0][column]", "period");
        searchParams.append("sort[0][direction]", "asc");
        searchParams.append("sort[1][column]", "fromba");
        searchParams.append("sort[1][direction]", "asc");
        searchParams.append("sort[2][column]", "toba");
        searchParams.append("sort[2][direction]", "asc");
        searchParams.append("length", String(this.MAX_ROWS));
        searchParams.append("api_key", this.apiKey);

        return await this.fetchData(this.INTERCHANGE_DATA_ROUTE, searchParams);
    };

    formatTimestamp(d: Date): string {
        return moment(d).format('YYYY-MM-DDTHH');
    };

    private async fetchData (route: string, searchParams: URLSearchParams): Promise<any[]> {
        const MAX_ROWS = 5000; // Max number of rows we can request from the API in one call
        let offset = 0;
        let hasMoreData = true;
        let allData: any[] = [];

        while (hasMoreData) {
            searchParams.set("offset", String(offset));

            try {
                const url = `${this.BASE_URL}/${route}?${searchParams.toString()}`;
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
}
