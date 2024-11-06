import {USGridEmissionsPlugin} from '../../../lib';

describe('lib/us-grid-emissions: ', () => {
    const originalProcessEnv = process.env;
    const spy = jest.spyOn(global.console, 'warn');
    const parametersMetadata = {
        inputs: {},
        outputs: {},
    };

    beforeAll(() => {
        process.env.EIA_API_KEY = 'mock-key';
    });

    afterAll(() => {
        process.env = originalProcessEnv;
        spy.mockReset();
    });

    describe('USGridEmissionsPlugin(): ', () => {
        it('has metadata field.', () => {
            const plugin = USGridEmissionsPlugin({}, parametersMetadata, {});

            expect.assertions(3);
            expect(plugin).toHaveProperty('metadata');
            expect(plugin).toHaveProperty('execute');
            expect(typeof plugin.execute).toBe('function');
        });
    });
});
