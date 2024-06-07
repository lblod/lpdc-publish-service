import {app, errorHandler} from 'mu';
import {CronJob} from 'cron';
import bodyparser from 'body-parser';
import fetch from 'node-fetch';
import {
  getPublicServiceDetails,
  getServicesToPublish,
  updateStatusPublicService,
  STATUS_PUBLISHED_URI
} from './queries';
import {extractHeadersFromEnv} from './utils/extractHeadersFromEnv';
import {putDataToIpdc} from './utils/putDataToIpdc';
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FOLDER,
  LDES_ENDPOINT_HEADER_PREFIX
} from './env-config';
import {clearPublicationErrors} from "./utils/publication-error";

const POST_TO_LDES_ENABLED = process.env.POST_TO_LDES_ENABLED == 'true' || false;

app.use(bodyparser.json());

/*
 * send data to ldes feed
 */
async function postDataToLDES(uri, body) {
  try {
    const queryParams = new URLSearchParams({
      resource: uri
    });

    const headers = extractHeadersFromEnv(LDES_ENDPOINT_HEADER_PREFIX);
    headers["Content-Type"] = "text/turtle";

    const response = await fetch(`${LDES_ENDPOINT}/${LDES_FOLDER}?` + queryParams, {
      method: "POST",
      headers,
      body: body,
    });

    if (!response.ok) {
      throw new Error(response);
    }

  } catch (e) {
    console.log(e);
    throw e;
  }
}

let inProgress = false;

new CronJob(CRON_PATTERN, async () => {
  if (inProgress) {
    console.log('Process already in progress');
    return;
  }
  try {
    inProgress = true;
    const unpublishedServices = await getServicesToPublish();

    console.log(`Found ${unpublishedServices.length} to publish`);
    await clearPublicationErrors();
    for (const service of unpublishedServices) {
      try {
        const subjectsAndData = await getPublicServiceDetails(service.publicservice.value);

        if (POST_TO_LDES_ENABLED) {
          for (const subject of Object.keys(subjectsAndData)) {
            await postDataToLDES(subject, subjectsAndData[subject].body);
          }
        } else {
          console.log(`POST TO LDES disabled, skipping`);
        }
        await putDataToIpdc(service.graph.value, service.publicservice.value, subjectsAndData);
        await updateStatusPublicService(service.publicservice.value, service.dateModified.value);

        console.log(`Successfully published ${service.publicservice.value}`);
      } catch (e) {
        console.error(`Could not publish ${service.publicservice.value}`, e);
      }
    }
  } catch (e) {
    console.error('General error fetching data, retrying later');
    console.log(e);
  } finally {
    inProgress = false;
  }
}, null, true);

app.use(errorHandler);
