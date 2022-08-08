# LPDC Publish service

## Configuration

In order to configure this service, 3 environment variables need to be defined:

- `CRON_PATTERN` : for defining cron timed executions of the routine.
- `LDES_ENDPOINT`: url of the fragmenter on which the service will publish
- `LDES_FOLDER`:  *(optional)* folder of the fragmenter, the service will publish in.

