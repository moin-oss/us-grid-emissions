# us-grid-emissions

`us-grid-emissions` is an [IF](https://github.com/Green-Software-Foundation/if) plugin that calculate the carbon emissions per hour amongst all US balancing authorities.

## Implementation

The `emissions` value in the output is measured by multiplying the hourly net generation for an energy sourcing, multiplying it by its emissions factor, and adding these values for each energy source together.
The EIA API fuel-type-data [endpoint](https://www.eia.gov/opendata/browser/electricity/rto/fuel-type-data?frequency=hourly&data=value) is what's used to retrieve the hourly generation by energy source.

## Required Environment Variables
```
export EIA_API_KEY=<secret>
```

## Testing locally
### Using make:
   1. make install
      1. This performs the npm build steps.
   2. make test
      1. This will run the test suite.
   3. make test_example 
      1. This will run the example file using the Impact Framework.

### Running manually
1. [Build and link]((https://if.greensoftware.foundation/developers/how-to-build-plugins#step-3-install-your-plugin)) the plugin from your local source (you need to do this each time you make a change)
   1. `npm install`
   1. `npm run build`
   1. `npm link`
1. Set up the manifest file 
   1. `cp sample-input.yml test.yml`
   1. Make changes to the inputs in test.yml based on the date range and BA for which you're seeking the carbon emissions. 
   1. Configure connection to EIA API with an API key set up as an environment variable as mentioned in [Required Environment Variables](#required-environment-variables). Navigate [here](https://www.eia.gov/opendata/register.php) to register for an EIA API key if you do not already have one.
1. Run the plugin with `if-run --manifest test.yml`
1. Run tests with `npm test.`
