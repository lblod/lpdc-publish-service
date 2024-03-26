# LPDC (Lokale Producten- en Dienstencatalogus) - Publishing Service

_Note_: Documentation is structured using [The software guidebook by Simon Brown](https://leanpub.com/documenting-software-architecture).

LPDC Publishing Service is part of [LPDC - Digitaal loket](https://github.com/lblod/app-lpdc-digitaal-loket/tree/development). This contains general documentation. Specific documentation to be found in this project.

# 1. Context

This service publishes sent documents to a LDES feed.
It requests document regularly using `cron`.

# 2. Functional Overview

# 3. Quality Attributes

# 4. Constraints

# 5. Principles

# 6. Software Architecture

# 7. Code

# 8. Data

# 9. Infrastructure Architecture

# 10. Deployment

## Configuration

In order to configure this service, 3 environment variables need to be defined:

- `CRON_PATTERN` : for defining cron timed executions of the routine.
- `LDES_ENDPOINT`: url of the fragmenter on which the service will publish
- `LDES_FOLDER`:  *(optional)* folder of the fragmenter, the service will publish in.
- `LDES_ENDPOINT_HEADER_<key>`: [string]: A header key-value combination which should be send as part of the headers to the LDES ENDPOINT. E.g. LDES_ENDPOINT_HEADER_X-API-KEY: <api_key>.

## Docker-compose configuration

For using this service in a docker-compose stack, the following example can be used

```
lpdc-push-to-producer:
    image: lpdc-push-to-producer # image will be soon available
    environment:
      NODE_ENV: "development"
      LDES_ENDPOINT: "http://fragmentation-producer:3000/"
      LDES_FOLDER: "foldername"
```

## Release a new version
We use [release-it](https://github.com/release-it/release-it/tree/main) to make a new release.

```shell
  npm run release
```

# 11. Operation and Support

# 12. Development Environment

# 13. Decision Log

