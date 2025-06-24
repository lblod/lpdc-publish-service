# LPDC (Lokale Producten- en Dienstencatalogus) - Publishing Service

LPDC Publishing Service is part of [LPDC - Digitaal loket](https://github.com/lblod/app-lpdc-digitaal-loket/tree/development). This contains general documentation. Specific documentation to be found in this project.

# Context

This service publishes sent documents to a LDES feed.
It requests document regularly using `cron`.

# Deployment

## Environment variables

| Name                 | Description                                                         | Default      |
|----------------------|---------------------------------------------------------------------|--------------|
| `CRON_PATTERN`       | How often to check for publishable product instances                | Every minute |
| `IPDC_JSON_ENDPOINT` | The IPDC endpoint to publish product instances to                   | None         |
| `IPDC_X_API_KEY`     | The API key add in calls to the IPDC endpoint                       | None         |
| `LDES_ENDPOINT`      | url of the fragmenter on which the service will publish             | None         |
| `LDES_FOLDER`        | *(optional)* folder of the fragmenter, the service will publish in. | ""           |

## Docker-compose configuration

For using this service in a docker-compose stack, the following example can be used

```
lpdc-push-to-producer:
    image: lblod/lpdc-publish-service:X.Y.Z
    environment:
      NODE_ENV: "development"
      IPDC_JSON_ENDPOINT: "<IPDC endpoint url>"
      IPDC_X_API_KEY: "<IPDC api key>"
```

## Release a new version
We use [release-it](https://github.com/release-it/release-it/tree/main) to make a new release.

```shell
  npm run release
```
