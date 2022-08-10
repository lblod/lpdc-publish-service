# LPDC Publish service

This service publishes sent documents to a LDES feed.
It requests document regularly using `cron`.

## Configuration

In order to configure this service, 3 environment variables need to be defined:

- `CRON_PATTERN` : for defining cron timed executions of the routine.
- `LDES_ENDPOINT`: url of the fragmenter on which the service will publish
- `LDES_FOLDER`:  *(optional)* folder of the fragmenter, the service will publish in.

### Docker-compose configuration

For using this service in a docker-compose stack, the following example can be used

```
lpdc-push-to-producer:
    image: lpdc-push-to-producer # image will be soon available
    environment:
      NODE_ENV: "development"
      LDES_ENDPOINT: "http://fragmentation-producer:3000/"
      LDES_FOLDER: "foldername"
```
