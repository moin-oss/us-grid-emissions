import {USGridEmissionsPlugin} from '../../../lib';

describe('lib/my-custom-plugin: ', () => {
    describe('MyCustomPlugin(): ', () => {
        it('has metadata field.', () => {
            const pluginInstance = USGridEmissionsPlugin({}, {}, {});

            expect(pluginInstance).toHaveProperty('metadata');
            expect(pluginInstance).toHaveProperty('execute');
            expect(typeof pluginInstance.execute).toBe('function');
        });

        describe('execute(): ', () => {
            it('applies logic on provided inputs array.', async () => {
                const pluginInstance = USGridEmissionsPlugin({}, {}, {});
                const inputs = [{}];

                const response = await pluginInstance.execute(inputs);
                expect(response).toEqual(inputs);
            });
        });
    });
});
